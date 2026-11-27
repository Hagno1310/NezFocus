import { isDeepStrictEqual } from 'node:util';
import { Injectable, Logger } from '@nestjs/common';
import {
  ErrorCode,
  Permission,
  type FocusSessionAction,
  type FocusSessionEndReason,
  type FocusSessionState,
  type StartFocusSessionRequest,
} from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import type { Tx } from '../../db/db.module.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PresenceSink } from '../gateway/presence.service.js';
import { PermissionService } from '../permissions/permission.service.js';
import { ServersRepository } from '../servers/servers.repository.js';
import { ChannelTypeCode } from '../servers/servers.schema.js';
import type { VoiceLeft, VoiceRoomMove } from '../voice/voice-events.js';
import { VoiceService } from '../voice/voice.service.js';
import type { FocusInterval } from './focused-time.js';
import {
  advanceRoom,
  applyRoomAction,
  endRoom,
  startRoom,
  type RoomControl,
  type RoomStep,
  type RoomState,
} from './room-machine.js';
import {
  meOf,
  toFocusSessionEnd,
  toFocusSessionJson,
  toFocusSessionResponse,
} from './room-session.dto.js';
import {
  RoomSessionRepository,
  type Participation,
  type RoomRecord,
} from './room-session.repository.js';
import { SoloSessionService } from './solo-session.service.js';
import { StreakService } from './streak.service.js';
import { StudyStatsRepository } from './study-stats.repository.js';

// REQ-STUDY-01 AC7: a room nobody sits in (away seats count, CR-28 #38) for this long ends its session.
export const EMPTY_ROOM_MS = 5 * 60_000;

// The BullMQ jobs (SRS 7.3.6): a phase end, and the 5-minute empty-room check.
export abstract class RoomScheduler {
  abstract tick(sessionId: bigint, at: Date): Promise<void>;
  abstract emptyCheck(sessionId: bigint, since: Date): Promise<void>;
}

export type RoomView = {
  record: RoomRecord;
  parts: Participation[];
  now: Date;
};

type Occupant = { userId: bigint; joinedAt: Date; away: boolean };

const notFound = () =>
  new AppError(ErrorCode.NotFound, 'Unknown Room Session or room');
const forbidden = (why: string) => new AppError(ErrorCode.Forbidden, why);
const users = (parts: Participation[], open = false) => [
  ...new Set(
    parts.filter((p) => !open || p.leftAt === null).map((p) => p.userId),
  ),
];
const runningFocus = (s: RoomState, until: Date): FocusInterval[] =>
  s.status === 'running' && s.phase === 'focus' && until > s.phaseStartedAt
    ? [{ start: s.phaseStartedAt, end: until, phaseEndsAt: s.phaseEndsAt }]
    : [];

// REQ-STUDY-01 / 11 / 15: the backend owns the Room Session clock and who is counted; apps only display it.
@Injectable()
export class RoomSessionService {
  private readonly logger = new Logger('RoomSession');

  constructor(
    private readonly sessions: RoomSessionRepository,
    private readonly stats: StudyStatsRepository,
    private readonly ids: SnowflakeGenerator,
    private readonly clock: Clock,
    private readonly events: EventPublisher,
    private readonly scheduler: RoomScheduler,
    private readonly streaks: StreakService,
    private readonly permissions: PermissionService,
    private readonly servers: ServersRepository,
    private readonly voice: VoiceService,
    private readonly solo: SoloSessionService,
    private readonly presence: PresenceSink,
  ) {}

  // POST /channels/{id}/focus-session.
  async start(
    userId: bigint,
    channelId: bigint,
    body: StartFocusSessionRequest,
  ): Promise<RoomView> {
    const channel = await this.servers.findChannel(channelId);
    if (
      !channel?.serverId ||
      channel.type !== ChannelTypeCode.voice ||
      !(await this.can(userId, channelId, Permission.VIEW_CHANNEL))
    )
      throw notFound();
    // STUDY-01 AC8, STUDY-11 AC3.
    if (channel.focusControl === 'off')
      throw forbidden('This voice channel is not a Phòng học');
    if (!(await this.mayHost(userId, channelId)))
      throw forbidden('Only MANAGE_STUDY_ROOMS starts here');
    // STUDY-11: the starter is in the room (CR-28 #38: else 40302).
    if ((await this.voice.seatOf(userId))?.channelId !== channelId)
      throw forbidden('Join the room before starting');

    const occupants = await this.voice.occupants(channelId);
    const now = this.clock.now();
    const record: RoomRecord = {
      id: this.ids.next(),
      channelId,
      serverId: channel.serverId,
      startedBy: userId,
      hostId: userId, // STUDY-11: who starts is the Host
      startedAt: now,
      emptySince: null,
      state: startRoom(body.cycle_config, userId.toString(), now),
    };
    const announceSolo = await this.sessions.transaction(async (tx) => {
      const taken = () =>
        new AppError(
          ErrorCode.FocusSessionAlreadyActive,
          'This room already has a Room Session',
        );
      // STUDY-01 AC2 first: confirming "end my Solo" must not end it when someone else started meanwhile.
      if ((await this.sessions.activeIdOf(channelId, tx)) !== undefined)
        throw taken();
      // STUDY-10 AC8: Solo running and no end_solo.
      if (!body.end_solo && (await this.solo.hasActive(userId, tx)))
        throw new AppError(
          ErrorCode.FocusSessionAlreadyActive,
          'A Solo Session is running; send end_solo to end it',
        );
      if (!(await this.sessions.insert(tx, record))) throw taken();
      // STUDY-10 AC8 / AC9: everyone's Solo in this room ends (joined_room); all become Participants.
      const announce = await this.solo.joinRoom(
        tx,
        occupants.map((o) => o.userId),
        now,
      );
      await this.sessions.join(
        tx,
        record.id,
        occupants.map((o) => ({
          id: this.ids.next(),
          userId: o.userId,
          joinedAt: now, // STUDY-15 AC7: from the session start, not from entering the room
        })),
      );
      return announce;
    });
    await announceSolo();
    const view = {
      record,
      parts: await this.sessions.participations(record.id),
      now,
    };
    await this.announce(view, 'FOCUS_SESSION_START');
    return view;
  }

  // PATCH /focus-sessions/{id}. null: stopped (204).
  async act(
    userId: bigint,
    id: bigint,
    action: FocusSessionAction,
  ): Promise<RoomView | null> {
    const before = await this.sessions.find(id);
    if (
      !before ||
      !(await this.can(userId, before.channelId, Permission.VIEW_CHANNEL))
    )
      throw notFound();
    const ended = before.state.status === 'ended';
    // Stop is idempotent (Tắt Phòng học at the same moment is no error, #145).
    if (action.action === 'stop' && ended) return null;
    if (ended)
      throw new AppError(ErrorCode.Conflict, 'This Room Session has ended');

    // STUDY-11 AC1 / AC4 / AC11 / AC12.
    const manages =
      before.hostId === userId ||
      (await this.can(userId, before.channelId, Permission.MANAGE_STUDY_ROOMS));
    if (!manages) {
      const inRoom =
        (await this.voice.seatOf(userId))?.channelId === before.channelId;
      if (!(action.action === 'resume' && before.hostId === null && inRoom))
        throw forbidden('Only the Host or MANAGE_STUDY_ROOMS controls this');
    }

    if (action.action === 'stop') {
      await this.end(id, 'stopped', userId);
      return null;
    }
    // zod's enum member keeps 'stop' in its type; it was handled just above.
    const control = action as RoomControl;
    const by = userId.toString();
    return this.apply(id, (s, now) => applyRoomAction(s, control, by, now));
  }

  // The BullMQ phase job.
  async tick(id: bigint) {
    await this.apply(id, advanceRoom);
  }

  // Stop, Phòng học off (STUDY-11 AC7), channel deleted, empty room. Ending twice ends once.
  async end(id: bigint, reason: FocusSessionEndReason, by: bigint | null) {
    await this.apply(id, (s, now) => endRoom(s, reason, by, now));
  }

  async endIn(
    channelId: bigint,
    reason: FocusSessionEndReason,
    by: bigint | null,
  ) {
    const id = await this.sessions.activeIdOf(channelId);
    if (id !== undefined) await this.end(id, reason, by);
  }

  // VOICE_JOINED (REQ-STUDY-15 (2)): who sits down in a running session counts from now; their Solo
  // ends (STUDY-10 AC7); a session without Host takes the first who may start (STUDY-11 AC5).
  async roomJoined({ userId, channelId, at }: VoiceRoomMove) {
    const id = await this.sessions.activeIdOf(channelId);
    if (id === undefined) return;
    const mayHost = await this.mayHost(userId, channelId);
    const done = await this.sessions.transaction(async (tx) => {
      const before = await this.sessions.lock(tx, id);
      if (!before || before.state.status === 'ended') return null;
      const tookHost = before.hostId === null && mayHost;
      const record = {
        ...before,
        emptySince: null, // someone back within 5 minutes (STUDY-01 AC7)
        hostId: tookHost ? userId : before.hostId,
      };
      if (!isDeepStrictEqual(record, before))
        await this.sessions.save(tx, record);
      const open = await this.sessions.openOf(userId, tx);
      let announceSolo = async () => {};
      if (open?.sessionId !== id) {
        if (open) await this.sessions.leave(tx, open.id, at); // a stale one elsewhere
        announceSolo = await this.solo.joinRoom(tx, [userId], at);
        await this.sessions.join(tx, id, [
          { id: this.ids.next(), userId, joinedAt: at },
        ]);
      }
      return {
        record,
        tookHost,
        announceSolo,
        parts: await this.sessions.participations(id, tx),
      };
    });
    if (!done) return;
    await done.announceSolo();
    const view = { record: done.record, parts: done.parts, now: at };
    // STUDY-11 AC5: the room sees its new Host; otherwise only the newcomer needs `me`.
    if (done.tookHost) await this.announce(view, 'FOCUS_SESSION_UPDATE');
    else await this.tell(view, userId, 'FOCUS_SESSION_UPDATE');
  }

  // VOICE_LEFT: the stay is credited and closed now (STUDY-15 AC5), or at the last heartbeat when the
  // 3 minutes away ran out (AC2); a Host leaving hands over (STUDY-11 AC2 / AC5); an empty room
  // starts its 5 minutes (STUDY-01 AC7).
  async roomLeft({ userId, channelId, at, away }: VoiceLeft) {
    const id = await this.sessions.activeIdOf(channelId);
    if (id === undefined) return;
    const occupants = await this.voice.occupants(channelId);
    const successor = await this.successor(channelId, occupants);
    const done = await this.sessions.transaction(async (tx) => {
      const before = await this.sessions.lock(tx, id);
      if (!before || before.state.status === 'ended') return null;
      // A phase that ended before the job ran is credited to everyone first.
      const { state, focus } = advanceRoom(before.state, at);
      const parts = await this.sessions.participations(id, tx);
      // Their seat is gone already; away until now, they count to their last heartbeat too.
      const seen = away
        ? [...occupants, { userId, joinedAt: at, away: true }]
        : occupants;
      const credited = await this.credit(tx, parts, focus, seen);
      const mine = parts.find((p) => p.userId === userId && !p.leftAt);
      if (mine) {
        const until =
          away && mine.lastHeartbeatAt < at ? mine.lastHeartbeatAt : at;
        const fresh = (await this.sessions.participations(id, tx)).find(
          (p) => p.id === mine.id,
        )!;
        for (const u of await this.credit(
          tx,
          [fresh],
          runningFocus(state, until),
          [],
        ))
          credited.add(u);
        await this.sessions.leave(tx, mine.id, until);
      }
      const hostLeft = before.hostId === userId;
      const emptied = !occupants.length && !before.emptySince;
      const record: RoomRecord = {
        ...before,
        state,
        hostId: hostLeft ? successor : before.hostId,
        emptySince: emptied ? at : before.emptySince,
      };
      await this.sessions.save(tx, record);
      return {
        record,
        credited,
        hostLeft,
        emptied,
        tookPart: !!mine,
        moved: focus.length > 0,
        parts: await this.sessions.participations(id, tx),
      };
    });
    if (!done) return;
    for (const u of done.credited) await this.streaks.announce(u);
    await this.presence.roomSessionChanged(userId, null);
    const view = { record: done.record, parts: done.parts, now: at };
    if (done.hostLeft || done.moved)
      await this.announce(view, 'FOCUS_SESSION_UPDATE');
    else if (done.tookPart)
      await this.tell(view, userId, 'FOCUS_SESSION_UPDATE');
    if (done.emptied)
      await this.scheduler
        .emptyCheck(id, at)
        .catch((err: unknown) =>
          this.logger.error(`empty check ${id}: ${String(err)}`),
        );
  }

  // The empty-room job: still the same empty stretch, and still nobody in.
  async emptyCheck(id: bigint, since: Date) {
    const r = await this.sessions.find(id);
    if (
      !r ||
      r.state.status === 'ended' ||
      r.emptySince?.getTime() !== since.getTime() ||
      (await this.voice.occupants(r.channelId)).length
    )
      return;
    await this.end(id, 'empty_channel', null);
  }

  // Op 5 FOCUS_HEARTBEAT (REQ-STUDY-15 (2)); one for a session I am not counted in is dropped.
  async heartbeat(userId: bigint, sessionId: bigint) {
    await this.sessions.heartbeat(userId, sessionId, this.clock.now());
  }

  // STUDY-11 "Chuyển Host": who has sat in the room longest and may start under focus_control.
  async successor(channelId: bigint, occupants: Occupant[]) {
    const byStay = [...occupants].sort(
      (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
    );
    for (const o of byStay)
      if (await this.mayHost(o.userId, channelId)) return o.userId;
    return null;
  }

  // READY.focus_sessions (CR-28 #38): running sessions of the rooms I can view, `me` mine.
  async ready(userId: bigint): Promise<FocusSessionState[]> {
    const records: RoomRecord[] = [];
    for (const r of await this.sessions.activeForMember(userId))
      if (await this.can(userId, r.channelId, Permission.VIEW_CHANNEL))
        records.push(r);
    const mine = await this.sessions.participationsOf(
      userId,
      records.map((r) => r.id),
    );
    return records.map((r) =>
      toFocusSessionJson(
        r,
        meOf(
          r,
          mine.filter((p) => p.sessionId === r.id),
        ),
      ),
    );
  }

  private can(userId: bigint, channelId: bigint, permission: bigint) {
    return this.permissions.can(userId, { channelId }, permission);
  }

  // STUDY-11: everyone may start in `everyone`, only MANAGE_STUDY_ROOMS in `managers`.
  private async mayHost(userId: bigint, channelId: bigint) {
    const channel = await this.servers.findChannel(channelId);
    if (channel?.focusControl === 'everyone') return true;
    return (
      channel?.focusControl === 'managers' &&
      this.can(userId, channelId, Permission.MANAGE_STUDY_ROOMS)
    );
  }

  private async apply(
    id: bigint,
    step: (s: RoomState, now: Date) => RoomStep,
  ): Promise<RoomView> {
    const now = this.clock.now();
    const channelId = (await this.sessions.find(id))?.channelId;
    const occupants = channelId ? await this.voice.occupants(channelId) : [];
    const { view, credited, changed } = await this.sessions.transaction(
      async (tx) => {
        const before = await this.sessions.lock(tx, id);
        if (!before) throw notFound();
        const parts = await this.sessions.participations(id, tx);
        const { state, focus } = step(before.state, now);
        if (focus.length === 0 && isDeepStrictEqual(state, before.state))
          return {
            view: { record: before, parts, now },
            credited: new Set<bigint>(),
            changed: false,
          };
        const record = { ...before, state };
        // DEC-24: everyone's focus is credited at each phase end and on pause / skip / stop.
        const credited = await this.credit(tx, parts, focus, occupants);
        await this.sessions.save(tx, record);
        if (state.status === 'ended')
          await this.sessions.leaveAll(tx, id, state.endedAt!);
        return {
          view: {
            record,
            parts: await this.sessions.participations(id, tx),
            now,
          },
          credited,
          changed: true,
        };
      },
    );
    if (!changed) return view;
    // CR-28 #38: today's minutes and the streak reach the app before the END.
    for (const userId of credited) await this.streaks.announce(userId);
    if (view.record.state.status === 'ended') await this.announceEnd(view);
    else await this.announce(view, 'FOCUS_SESSION_UPDATE');
    return view;
  }

  // Each open Participation gets the part of the focus it was there for (REQ-STUDY-15). Someone away
  // counts only to their last heartbeat: back within 3 minutes they go on, else AC2 holds.
  private async credit(
    tx: Tx,
    parts: Participation[],
    focus: FocusInterval[],
    occupants: Occupant[],
  ) {
    const credited = new Set<bigint>();
    if (!focus.length) return credited;
    const away = new Set(occupants.filter((o) => o.away).map((o) => o.userId));
    for (const p of parts) {
      if (p.leftAt) continue;
      const cut = away.has(p.userId) ? p.lastHeartbeatAt : null;
      const intervals = focus.flatMap((iv) => {
        const start = p.joinedAt > iv.start ? p.joinedAt : iv.start;
        const end = cut && cut < iv.end ? cut : iv.end;
        return end > start ? [{ ...iv, start, end }] : [];
      });
      if (!intervals.length) continue;
      const days = await this.stats.credit(
        { userId: p.userId, source: 'room', intervals },
        tx,
      );
      if (!days.some((d) => d.seconds > 0)) continue;
      await this.sessions.credited(tx, p, days);
      credited.add(p.userId);
    }
    return credited;
  }

  // To who can view the room (CR-28 #38); whoever took part gets their own copy with `me`.
  private async announce(
    view: RoomView,
    t: 'FOCUS_SESSION_START' | 'FOCUS_SESSION_UPDATE',
  ) {
    const { record, parts, now } = view;
    const tookPart = users(parts);
    await this.events.toChannel(
      record.channelId,
      t,
      toFocusSessionResponse(record, null, now),
      tookPart,
    );
    for (const userId of tookPart) await this.tell(view, userId, t);
    // AUTH-05 (CR-24): Participants show "Đang học cùng nhóm" with the room's phase.
    const name = (await this.servers.findChannel(record.channelId))?.name ?? '';
    for (const userId of users(parts, true))
      await this.presence.roomSessionChanged(userId, {
        channelId: record.channelId,
        serverId: record.serverId,
        name,
        phase: record.state.phase,
        state: record.state.status === 'paused' ? 'paused' : 'running',
        phaseEndsAt: record.state.phaseEndsAt,
      });
    if (record.state.status === 'running')
      await this.scheduler
        .tick(record.id, record.state.phaseEndsAt!)
        // The next control moves the session on too, so a missed job only delays the event.
        .catch((err: unknown) =>
          this.logger.error(`could not schedule ${record.id}: ${String(err)}`),
        );
  }

  private tell(
    { record, parts, now }: RoomView,
    userId: bigint,
    t: 'FOCUS_SESSION_START' | 'FOCUS_SESSION_UPDATE',
  ) {
    const mine = parts.filter((p) => p.userId === userId);
    return this.events.toUser(
      userId,
      t,
      toFocusSessionResponse(record, meOf(record, mine), now),
    );
  }

  // STUDY-01: `focused_seconds` of the receiver only, never someone else's.
  private async announceEnd({ record, parts }: RoomView) {
    const tookPart = users(parts);
    await this.events.toChannel(
      record.channelId,
      'FOCUS_SESSION_END',
      toFocusSessionEnd(record, null),
      tookPart,
    );
    for (const userId of tookPart) {
      await this.events.toUser(
        userId,
        'FOCUS_SESSION_END',
        toFocusSessionEnd(
          record,
          parts
            .filter((p) => p.userId === userId)
            .reduce((n, p) => n + p.focusedSeconds, 0),
        ),
      );
      await this.presence.roomSessionChanged(userId, null);
    }
  }
}
