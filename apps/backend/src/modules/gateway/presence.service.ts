import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  Permission,
  type FocusPhase,
  type PresenceEvent,
  type PresenceUpdate,
  type SoloSession,
  type StudyActivity,
} from '@nezfocus/shared';
import { BlockQuery } from '../friends/block-query.js';
import { PermissionService } from '../permissions/permission.service.js';
import { GatewaySessions, type GatewaySession } from './gateway-sessions.js';
import {
  aggregate,
  soloActivity,
  SWEEP_MS,
  visibleActivity,
} from './presence.js';
import {
  PresenceRepository,
  type PresenceSettings,
} from './presence.repository.js';

// What other modules call when something presence shows has changed (WORKFLOW 4.3).
export abstract class PresenceSink {
  // REQ-STUDY-10 / AUTH-05 CR-24: every Solo change; null or ended = no Solo.
  abstract soloChanged(userId: bigint, solo: SoloSession | null): void;
  // P1-A5.1 (#76) calls this when preferred_status or show_study_activity changes by REST.
  abstract settingsChanged(userId: bigint): Promise<void>;
  // P2-B2.2 (#111): friend added / removed, block added / removed between a and b.
  abstract relationshipChanged(a: bigint, b: bigint): Promise<void>;
  // P3-B1.2 (#138), AUTH-05 CR-24: the voice room the user sits in; null = none.
  abstract voiceChanged(userId: bigint, room: VoiceRoom | null): Promise<void>;
  // P3-B3.3 (#147), AUTH-05 CR-24: the Room Session the user is a Participant of; null = none.
  abstract roomSessionChanged(
    userId: bigint,
    room: StudyGroupRoom | null,
  ): Promise<void>;
}

export type StudyGroupRoom = {
  channelId: bigint;
  serverId: bigint;
  name: string;
  phase: FocusPhase;
  state: 'running' | 'paused';
  phaseEndsAt: Date | null;
};

export type VoiceRoom = {
  channelId: bigint;
  serverId: bigint;
  name: string;
  studyRoom: boolean;
};

// Read side for other modules: how many of these users others see online right now
// (REQ-SRV-04 preview "N đang online"; Invisible counts as offline). Owner: gateway (B).
export abstract class PresenceReader {
  abstract onlineCount(userIds: readonly bigint[]): number;
}

type UserPresence = {
  settings: PresenceSettings;
  activity: StudyActivity | null; // Solo
  voice: StudyActivity | null; // shown when there is no Solo
  group: StudyActivity | null; // a Room Session: shown over the voice room it runs in
  sent: string; // JSON of the last PRESENCE_UPDATE, to send only real changes
};

const OFFLINE = (userId: bigint): PresenceEvent => ({
  user_id: userId.toString(),
  status: 'offline',
  activity: null,
});

// REQ-AUTH-05. ponytail: in memory beside the Gateway sessions (one process, SRS 7.1.1), lost on
// restart with them; moves to Redis together with the sessions when running 2+ processes.
@Injectable()
export class PresenceService
  extends PresenceSink
  implements PresenceReader, OnModuleInit, OnModuleDestroy
{
  private readonly users = new Map<bigint, UserPresence>();
  private sweep?: ReturnType<typeof setInterval>;
  private readonly logger = new Logger('Presence');

  constructor(
    private readonly sessions: GatewaySessions,
    private readonly repo: PresenceRepository,
    private readonly blocks: BlockQuery,
    private readonly permissions: PermissionService,
  ) {
    super();
  }

  onModuleInit() {
    // AUTH-05 AC1 (background) and AC3 (silent devices) happen without any frame.
    this.sweep = setInterval(() => void this.sweepAll(), SWEEP_MS);
  }

  onModuleDestroy() {
    clearInterval(this.sweep);
  }

  // READY: my chosen status and who is not offline among the people I receive.
  async ready(userId: bigint) {
    const me = await this.load(userId);
    const hidden = await this.blockedEitherWay(userId);
    const presences: PresenceEvent[] = [];
    for (const id of await this.repo.receivers(userId)) {
      const e = this.eventFor(id, hidden.has(id));
      if (e.status !== 'offline') presences.push(await this.roomFor(e, userId));
    }
    return { preferred_status: me.settings.preferred, presences };
  }

  async update(session: GatewaySession, d: PresenceUpdate) {
    session.afk = d.afk;
    const me = await this.load(session.userId);
    // An afk-only frame (no status) leaves the status picked on another device alone.
    if (d.status && d.status !== me.settings.preferred) {
      me.settings = { ...me.settings, preferred: d.status };
      await this.repo.savePreferred(session.userId, d.status);
    }
    await this.changed(session.userId);
  }

  // Fire and forget from SoloSessionService: a failure is logged, never thrown into the Solo action.
  soloChanged(userId: bigint, solo: SoloSession | null) {
    this.load(userId)
      .then((me) => {
        me.activity = soloActivity(solo);
        return this.changed(userId);
      })
      .catch((err: unknown) =>
        this.logger.error(`solo ${userId}: ${String(err)}`),
      );
  }

  // Awaited by voice so a switch (null, then the new room) lands in order. ponytail: khi backend
  // khởi động lại: người còn ngồi trong phòng hiện lại hoạt động voice ở lần đổi ghế kế tiếp.
  voiceChanged(userId: bigint, room: VoiceRoom | null) {
    return this.load(userId)
      .then((me) => {
        me.voice = room && {
          kind: 'voice',
          room: {
            channel_id: room.channelId.toString(),
            server_id: room.serverId.toString(),
            channel_name: room.name,
            study_room: room.studyRoom,
          },
        };
        return this.changed(userId);
      })
      .catch((err: unknown) =>
        this.logger.error(`voice ${userId}: ${String(err)}`),
      );
  }

  roomSessionChanged(userId: bigint, room: StudyGroupRoom | null) {
    return this.load(userId)
      .then((me) => {
        me.group = room && {
          kind: 'group_study',
          room: {
            channel_id: room.channelId.toString(),
            server_id: room.serverId.toString(),
            channel_name: room.name,
            phase: room.phase,
            state: room.state,
            phase_ends_at: room.phaseEndsAt?.toISOString() ?? null,
          },
        };
        return this.changed(userId);
      })
      .catch((err: unknown) =>
        this.logger.error(`room session ${userId}: ${String(err)}`),
      );
  }

  async settingsChanged(userId: bigint) {
    const me = await this.load(userId);
    me.settings = await this.repo.settings(userId);
    await this.changed(userId);
  }

  async changed(userId: bigint) {
    if (this.unchanged(userId)) return this.forgetIfGone(userId);
    const receivers = await this.repo.receivers(userId);
    const hidden = await this.blockedEitherWay(userId);
    // Computed again after the await: a newer call may have sent meanwhile, and a stale event must not
    // go out after it.
    const me = this.users.get(userId);
    if (!me || this.unchanged(userId)) return this.forgetIfGone(userId);
    const event = this.event(userId);
    me.sent = JSON.stringify(event);
    for (const receiver of receivers)
      await this.sessions.dispatchToUser(
        receiver,
        'PRESENCE_UPDATE',
        hidden.has(receiver)
          ? { ...event, activity: null }
          : await this.roomFor(event, receiver),
      );
    this.forgetIfGone(userId);
  }

  // Each one's presence as the other may now see it; nothing when they no longer share anything.
  async relationshipChanged(a: bigint, b: bigint) {
    const blocked = await this.blocks.isBlockedEitherWay(a, b);
    for (const [from, to] of [
      [a, b],
      [b, a],
    ] as const)
      if ((await this.repo.receivers(from)).includes(to))
        await this.sessions.dispatchToUser(
          to,
          'PRESENCE_UPDATE',
          await this.roomFor(this.eventFor(from, blocked), to),
        );
  }

  onlineCount(userIds: readonly bigint[]) {
    return userIds.filter((id) => this.event(id).status !== 'offline').length;
  }

  private unchanged(userId: bigint) {
    const me = this.users.get(userId);
    return !me || JSON.stringify(this.event(userId)) === me.sent;
  }

  // No session left, no Solo, offline already announced: nothing to keep. Invisible but connected stays.
  private forgetIfGone(userId: bigint) {
    const me = this.users.get(userId);
    if (
      me &&
      !me.activity &&
      !me.voice &&
      !me.group &&
      me.sent === JSON.stringify(OFFLINE(userId)) &&
      !this.sessions.devicesOf(userId).length
    )
      this.users.delete(userId);
  }

  // AUTH-05 AC5: a block either way hides the activity, not the status.
  private async blockedEitherWay(userId: bigint) {
    const [blocked, blockers] = await Promise.all([
      this.blocks.blockedIds(userId),
      this.blocks.blockerIds(userId),
    ]);
    return new Set([...blocked, ...blockers]);
  }

  // AUTH-05 (CR-24): the room's name only to who can view it, else "Đang ở một phòng voice" / "Đang học cùng nhóm".
  private async roomFor(
    e: PresenceEvent,
    receiver: bigint,
  ): Promise<PresenceEvent> {
    const a = e.activity;
    if (a?.kind === 'solo' || !a?.room) return e;
    const sees = await this.permissions.can(
      receiver,
      { channelId: BigInt(a.room.channel_id) },
      Permission.VIEW_CHANNEL,
    );
    return sees ? e : { ...e, activity: { kind: a.kind, room: null } };
  }

  private eventFor(userId: bigint, hideActivity: boolean): PresenceEvent {
    const event = this.event(userId);
    return hideActivity ? { ...event, activity: null } : event;
  }

  private event(userId: bigint): PresenceEvent {
    const me = this.users.get(userId);
    if (!me) return OFFLINE(userId);
    const status = aggregate(
      me.settings.preferred,
      this.sessions.devicesOf(userId),
      Date.now(),
    );
    return {
      user_id: userId.toString(),
      status,
      activity: visibleActivity(me.activity ?? me.group ?? me.voice, {
        status,
        showActivity: me.settings.showActivity,
      }),
    };
  }

  // ponytail: after a backend restart a running Solo shows again at its next change (≤ one phase);
  // read SoloSessionService.current() here if that gap matters.
  private async load(userId: bigint): Promise<UserPresence> {
    let me = this.users.get(userId);
    if (!me) {
      const settings = await this.repo.settings(userId);
      // Another call may have loaded it while we waited.
      me = this.users.get(userId) ?? {
        settings,
        activity: null,
        voice: null,
        group: null,
        sent: JSON.stringify(OFFLINE(userId)),
      };
      this.users.set(userId, me);
    }
    return me;
  }

  private async sweepAll() {
    for (const userId of [...this.users.keys()])
      await this.changed(userId).catch((err: unknown) =>
        this.logger.error(`sweep ${userId}: ${String(err)}`),
      );
  }
}
