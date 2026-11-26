import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  ErrorCode,
  Permission,
  type CreateVoiceTokenRequest,
  type VoiceLeaveReason,
  type VoiceRoomMember,
  type VoiceState,
  type VoiceStateUpdate,
  type VoiceTokenResponse,
} from '@nezfocus/shared';
import type { WebhookEvent } from 'livekit-server-sdk';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PresenceSink } from '../gateway/presence.service.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ServersRepository } from '../servers/servers.repository.js';
import { ChannelTypeCode } from '../servers/servers.schema.js';
import {
  channelOfRoom,
  LiveKitKeys,
  LiveKitRooms,
  roomOf,
  type Publishable,
} from './livekit.js';
import { VoiceSeats, type Seat } from './voice-seats.js';
import { VoiceRepository } from './voice.repository.js';
import {
  VoiceService,
  type VoiceCaller,
  type VoiceScope,
  type VoiceSessions,
} from './voice.service.js';

export const AWAY_MS = 3 * 60_000; // REQ-VC-01: losing the connection is not leaving, for 3 minutes
const SWEEP_MS = 5_000;
// DisconnectReason.DUPLICATE_IDENTITY (@livekit/protocol): the account joined again elsewhere.
const DUPLICATE_IDENTITY = 2;

const notFound = () => new AppError(ErrorCode.NotFound, 'Unknown voice room');

// REQ-VC-01 / STUDY-02: token here, seat by op 4, webhooks catch connections that vanish.
@Injectable()
export class VoiceRoomsService
  extends VoiceService
  implements VoiceSessions, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('VoiceRooms');
  private sweeper?: ReturnType<typeof setInterval>;
  // ponytail: khi chạy từ 2 process: khóa theo user trong Redis (WATCH / Lua) thay hàng đợi này.
  private readonly queues = new Map<bigint, Promise<unknown>>();

  constructor(
    private readonly seats: VoiceSeats,
    private readonly rooms: LiveKitRooms,
    private readonly keys: LiveKitKeys,
    private readonly servers: ServersRepository,
    private readonly permissions: PermissionService,
    private readonly events: EventPublisher,
    private readonly repo: VoiceRepository,
    private readonly clock: Clock,
    private readonly presence: PresenceSink,
  ) {
    super();
  }

  // One change at a time per user: op 4, webhooks and the sweeper read then write the seat.
  private serial<T>(userId: bigint, work: () => Promise<T>): Promise<T> {
    const run = (this.queues.get(userId) ?? Promise.resolve()).then(work, work);
    const settled = run.catch(() => {});
    this.queues.set(userId, settled);
    void settled.then(() => {
      if (this.queues.get(userId) === settled) this.queues.delete(userId);
    });
    return run;
  }

  // ponytail: khi chạy từ 2 process: một process quét (khóa Redis), không gửi rời phòng hai lần.
  onModuleInit() {
    this.sweeper = setInterval(
      () =>
        void this.expireAway().catch((err: unknown) =>
          this.logger.error('away sweep', err),
        ),
      SWEEP_MS,
    );
    this.sweeper.unref();
  }

  onModuleDestroy() {
    clearInterval(this.sweeper);
  }

  // POST /voice/token. AC2 (âm): no CONNECT (timed out included, 8.5.2) → 40302, no token.
  async token(
    userId: bigint,
    body: CreateVoiceTokenRequest,
  ): Promise<VoiceTokenResponse> {
    // ponytail: `call:<id>` rooms come with P3-B6.2 (#156).
    if (!body.channel_id) throw notFound();
    const channel = await this.voiceChannel(userId, BigInt(body.channel_id));
    await this.permissions.require(
      userId,
      { channelId: channel.id },
      Permission.CONNECT,
    );
    const publish = await this.publishable(userId, channel);
    return {
      token: await this.keys.token(userId, roomOf(channel.id), publish),
      url: this.keys.url,
    };
  }

  // Op 4. A frame the user may not act on is dropped: the Gateway has no error reply.
  update(who: VoiceCaller, d: VoiceStateUpdate) {
    return this.serial(who.userId, () => this.sit(who, d));
  }

  private async sit(who: VoiceCaller, d: VoiceStateUpdate) {
    const seat = await this.seats.get(who.userId);
    if (d.channel_id === null) {
      // A late leave from a device that lost the seat must not unseat the new one.
      if (seat?.authSessionId === who.authSessionId)
        await this.vacate(seat, 'left');
      return;
    }
    const channelId = BigInt(d.channel_id);
    const channel = await this.voiceChannel(who.userId, channelId).catch(
      () => undefined,
    );
    if (
      !channel ||
      !(await this.permissions.can(
        who.userId,
        { channelId },
        Permission.CONNECT,
      ))
    )
      return;
    const sameRoom = seat?.channelId === channelId;
    if (seat && !sameRoom)
      await this.vacate(
        seat,
        seat.authSessionId === who.authSessionId ? 'switched' : 'other_device',
      );
    else if (seat && seat.authSessionId !== who.authSessionId)
      // Same room, new device: LiveKit already dropped the old one (duplicate identity).
      await this.events.toLogin(seat.authSessionId, 'VOICE_STATE_UPDATE', {
        ...(await this.leaving(seat)),
        reason: 'other_device',
      });
    const next: Seat = {
      userId: who.userId,
      channelId,
      serverId: channel.serverId!,
      authSessionId: who.authSessionId,
      selfMute: d.self_mute,
      selfVideo: d.self_video,
      joinedAt: sameRoom ? seat.joinedAt : this.clock.now().getTime(),
      saidAt: this.clock.now().getTime(),
      awayUntil: null,
    };
    await this.seats.put(next);
    await this.publish(next);
    if (!sameRoom)
      await this.presence.voiceChanged(who.userId, {
        channelId,
        name: channel.name ?? '',
        studyRoom: channel.focusControl !== 'off',
      });
  }

  // SRS 5.5: reconcile op 4. A left is never a leave (op 4 says that): away for 3 minutes.
  async webhook(event: WebhookEvent) {
    const channelId = event.room ? channelOfRoom(event.room.name) : null;
    if (channelId === null) return;
    if (event.event === 'room_finished') {
      for (const seat of await this.seats.inChannel(channelId))
        await this.serial(seat.userId, () =>
          this.away(seat.userId, channelId, event),
        );
      return;
    }
    const identity = event.participant?.identity;
    if (!identity || !/^\d+$/.test(identity)) return;
    const userId = BigInt(identity);
    if (event.event === 'participant_joined')
      return this.serial(userId, () => this.back(userId, channelId));
    // DUPLICATE_IDENTITY: the old device of an account that joined again, not this seat.
    if (
      event.event === 'participant_left' &&
      event.participant?.disconnectReason !== DUPLICATE_IDENTITY
    )
      return this.serial(userId, () => this.away(userId, channelId, event));
  }

  private async back(userId: bigint, channelId: bigint) {
    const seat = await this.seats.get(userId);
    if (seat?.channelId !== channelId || seat.awayUntil === null) return;
    const back = { ...seat, awayUntil: null };
    await this.seats.put(back);
    await this.publish(back);
  }

  private async away(
    userId: bigint,
    channelId: bigint,
    event: { createdAt?: bigint },
  ) {
    const seat = await this.seats.get(userId);
    if (seat?.channelId !== channelId || seat.awayUntil !== null) return;
    // Sent before the app last said where it sits (a reconnect): stale.
    if (Number(event.createdAt ?? 0n) * 1000 < seat.saidAt - 1000) return;
    const away = { ...seat, awayUntil: this.clock.now().getTime() + AWAY_MS };
    await this.seats.put(away);
    await this.publish(away);
  }

  // Away for more than 3 minutes = left (VC-01 AC6, STUDY-15).
  async expireAway() {
    const now = this.clock.now().getTime();
    for (const userId of await this.seats.expired(now))
      await this.serial(userId, async () => {
        const seat = await this.seats.get(userId);
        if (seat?.awayUntil != null && seat.awayUntil <= now)
          await this.vacate(seat, 'left');
      });
  }

  // READY.voice_states: rooms of my servers that I can view.
  async ready(userId: bigint): Promise<VoiceRoomMember[]> {
    const seats = await this.seats.inServers(
      await this.repo.serverIdsOf(userId),
    );
    const muted = await this.repo.modMutedAmong(seats.map((s) => s.userId));
    const sees = new Map<bigint, boolean>();
    const out: VoiceRoomMember[] = [];
    for (const seat of seats) {
      if (!sees.has(seat.channelId))
        sees.set(
          seat.channelId,
          await this.permissions.can(
            userId,
            { channelId: seat.channelId },
            Permission.VIEW_CHANNEL,
          ),
        );
      if (sees.get(seat.channelId))
        out.push(
          this.member(seat, muted.has(`${seat.serverId}:${seat.userId}`)),
        );
    }
    return out;
  }

  async disconnect(
    userId: bigint,
    scope: VoiceScope,
    reason: VoiceLeaveReason,
  ) {
    return this.serial(userId, async () => {
      const seat = await this.seats.get(userId);
      if (!seat || !inScope(seat, scope)) return false;
      await this.vacate(seat, reason);
      return true;
    });
  }

  async roomDeleted(serverId: bigint, channelId: bigint) {
    for (const seat of await this.seats.inChannel(channelId))
      if (seat.serverId === serverId)
        await this.disconnect(seat.userId, { channelId }, 'channel_deleted');
    await this.rooms.close(roomOf(channelId));
  }

  // REQ-VC-01: signing out (or being signed out) = leaving now, on that device only.
  async signedOut(authSessionId: bigint) {
    const seat = await this.seats.ofLogin(authSessionId);
    if (seat)
      await this.serial(seat.userId, async () => {
        const now = await this.seats.get(seat.userId);
        if (now?.authSessionId === authSessionId)
          await this.vacate(now, 'logout');
      });
  }

  async seatOf(userId: bigint) {
    const seat = await this.seats.get(userId);
    return seat ? { serverId: seat.serverId, channelId: seat.channelId } : null;
  }

  private async voiceChannel(userId: bigint, channelId: bigint) {
    const channel = await this.servers.findChannel(channelId);
    if (
      !channel?.serverId ||
      channel.type !== ChannelTypeCode.voice ||
      !(await this.permissions.can(
        userId,
        { channelId },
        Permission.VIEW_CHANNEL,
      ))
    )
      throw notFound();
    return channel;
  }

  // canPublish by SPEAK / VIDEO (SRS 5.5); a mod-muted member gets no mic (VC-04 AC5).
  private async publishable(
    userId: bigint,
    channel: { id: bigint; serverId: bigint | null },
  ): Promise<Publishable> {
    const scope = { channelId: channel.id };
    const [speak, video, muted] = await Promise.all([
      this.permissions.can(userId, scope, Permission.SPEAK),
      this.permissions.can(userId, scope, Permission.VIDEO),
      this.repo.modMuted(channel.serverId!, userId),
    ]);
    return { mic: speak && !muted, camera: video };
  }

  // Out of LiveKit, a leave to the room's viewers, the reason to that device only.
  private async vacate(seat: Seat, reason: VoiceLeaveReason) {
    if (!(await this.seats.remove(seat.userId))) return; // left already
    await this.presence.voiceChanged(seat.userId, null);
    await this.rooms.remove(roomOf(seat.channelId), seat.userId.toString());
    const left = await this.leaving(seat);
    await this.events.toChannel(seat.channelId, 'VOICE_STATE_UPDATE', left);
    await this.events.toLogin(seat.authSessionId, 'VOICE_STATE_UPDATE', {
      ...left,
      reason,
    });
  }

  private async leaving(seat: Seat): Promise<VoiceState> {
    return {
      ...(await this.stateOf(seat)),
      channel_id: null,
      joined_at: null,
      away: false,
    };
  }

  private async publish(seat: Seat) {
    await this.events.toChannel(
      seat.channelId,
      'VOICE_STATE_UPDATE',
      await this.stateOf(seat),
    );
  }

  private async stateOf(seat: Seat): Promise<VoiceState> {
    return this.member(
      seat,
      await this.repo.modMuted(seat.serverId, seat.userId),
    );
  }

  private member(seat: Seat, modMuted: boolean): VoiceRoomMember {
    return {
      user_id: seat.userId.toString(),
      channel_id: seat.channelId.toString(),
      server_id: seat.serverId.toString(),
      self_mute: seat.selfMute,
      self_video: seat.selfVideo,
      mod_muted: modMuted,
      joined_at: new Date(seat.joinedAt).toISOString(),
      away: seat.awayUntil !== null,
    };
  }
}

const inScope = (seat: Seat, scope: VoiceScope) =>
  scope === 'any' ||
  ('serverId' in scope
    ? seat.serverId === scope.serverId
    : seat.channelId === scope.channelId);
