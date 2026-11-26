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
  type Publish,
} from './livekit.js';
import { VoiceSeats, type Seat } from './voice-seats.js';
import { VoiceRepository } from './voice.repository.js';
import { VoiceService, type VoiceScope } from './voice.service.js';

export const AWAY_MS = 3 * 60_000; // REQ-VC-01: losing the connection is not leaving, for 3 minutes
const SWEEP_MS = 5_000;
// CLIENT_INITIATED of @livekit/protocol (not a direct dependency).
const CLIENT_INITIATED = 1;

const notFound = () => new AppError(ErrorCode.NotFound, 'Unknown voice room');

// Who is asking: a user on one login (device).
export type VoiceCaller = { userId: bigint; authSessionId: bigint };

// REQ-VC-01 / VC-04 / STUDY-02 (backend). The app dials LiveKit with a token from here, then
// tells the Gateway (op 4) where it sits; LiveKit webhooks catch connections that just vanish.
@Injectable()
export class VoiceRoomsService
  extends VoiceService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('VoiceRooms');
  private sweeper?: ReturnType<typeof setInterval>;

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
  async update(who: VoiceCaller, d: VoiceStateUpdate) {
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
        ...(await this.stateOf(seat)),
        channel_id: null,
        joined_at: null,
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
      awayUntil: null,
    };
    await this.seats.put(next);
    await this.publish(next);
    if (!sameRoom)
      this.presence.voiceChanged(who.userId, {
        channelId,
        name: channel.name ?? '',
        studyRoom: channel.focusControl !== 'off',
      });
  }

  // SRS 5.5: participant_joined / left reconcile what op 4 said; room_finished changes nothing
  // (an away seat outlives an empty room).
  async webhook(event: WebhookEvent) {
    const channelId = event.room ? channelOfRoom(event.room.name) : null;
    const identity = event.participant?.identity;
    if (channelId === null || !identity || !/^\d+$/.test(identity)) return;
    const seat = await this.seats.get(BigInt(identity));
    if (seat?.channelId !== channelId) return;

    if (event.event === 'participant_joined' && seat.awayUntil !== null) {
      const back = { ...seat, awayUntil: null };
      await this.seats.put(back);
      return this.publish(back);
    }
    if (event.event === 'participant_left' && seat.awayUntil === null) {
      if (event.participant?.disconnectReason === CLIENT_INITIATED)
        return this.vacate(seat, 'left');
      const away = { ...seat, awayUntil: this.clock.now().getTime() + AWAY_MS };
      await this.seats.put(away);
      return this.publish(away);
    }
  }

  // Away for more than 3 minutes = left (VC-01 AC6, STUDY-15).
  async expireAway() {
    const now = this.clock.now().getTime();
    for (const userId of await this.seats.expired(now)) {
      const seat = await this.seats.get(userId);
      if (
        seat?.awayUntil !== null &&
        seat?.awayUntil !== undefined &&
        seat.awayUntil <= now
      )
        await this.vacate(seat, 'left');
    }
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
    const seat = await this.seats.get(userId);
    if (!seat || !inScope(seat, scope)) return false;
    await this.vacate(seat, reason);
    return true;
  }

  async roomDeleted(serverId: bigint, channelId: bigint) {
    const seats = await this.seats.inServers([serverId]);
    for (const seat of seats.filter((s) => s.channelId === channelId))
      await this.vacate(seat, 'channel_deleted');
    await this.rooms.close(roomOf(channelId));
  }

  // REQ-VC-01: signing out (or being signed out) = leaving now, on that device only.
  async signedOut(authSessionId: bigint) {
    const seat = await this.seats.ofLogin(authSessionId);
    if (seat) await this.vacate(seat, 'logout');
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
  ): Promise<Publish> {
    const scope = { channelId: channel.id };
    const [speak, video, muted] = await Promise.all([
      this.permissions.can(userId, scope, Permission.SPEAK),
      this.permissions.can(userId, scope, Permission.VIDEO),
      this.repo.modMuted(channel.serverId!, userId),
    ]);
    return { mic: speak && !muted, camera: video };
  }

  // Leave now: out of LiveKit, a leave to the room's viewers, the reason to that device only.
  private async vacate(seat: Seat, reason: VoiceLeaveReason) {
    await this.seats.remove(seat.userId);
    this.presence.voiceChanged(seat.userId, null);
    await this.rooms.remove(roomOf(seat.channelId), seat.userId.toString());
    const left: VoiceState = {
      ...(await this.stateOf(seat)),
      channel_id: null,
      joined_at: null,
      away: false,
    };
    await this.events.toChannel(seat.channelId, 'VOICE_STATE_UPDATE', left);
    await this.events.toLogin(seat.authSessionId, 'VOICE_STATE_UPDATE', {
      ...left,
      reason,
    });
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
