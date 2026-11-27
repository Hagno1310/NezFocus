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
import { PermissionService } from '../permissions/permission.service.js';
import { ServersRepository } from '../servers/servers.repository.js';
import { ChannelTypeCode } from '../servers/servers.schema.js';
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

type Changed = { view: RoomView; credited: Set<bigint>; changed: boolean };

const notFound = () =>
  new AppError(ErrorCode.NotFound, 'Unknown Room Session or room');
const forbidden = (why: string) => new AppError(ErrorCode.Forbidden, why);
const users = (parts: Participation[], open = false) => [
  ...new Set(
    parts.filter((p) => !open || p.leftAt === null).map((p) => p.userId),
  ),
];

// REQ-STUDY-01 / 11: the backend owns the Room Session clock; apps only display it.
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
    if (
      channel.focusControl === 'managers' &&
      !(await this.can(userId, channelId, Permission.MANAGE_STUDY_ROOMS))
    )
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

  // VOICE_LEFT: the last seat gone starts the 5 minutes (STUDY-01 AC7).
  async roomLeft(channelId: bigint, at: Date) {
    const id = await this.sessions.activeIdOf(channelId);
    if (id === undefined || (await this.voice.occupants(channelId)).length)
      return;
    const marked = await this.sessions.transaction(async (tx) => {
      const r = await this.sessions.lock(tx, id);
      if (!r || r.state.status === 'ended' || r.emptySince) return false;
      await this.sessions.save(tx, { ...r, emptySince: at });
      return true;
    });
    if (marked)
      await this.scheduler
        .emptyCheck(id, at)
        .catch((err: unknown) =>
          this.logger.error(`empty check ${id}: ${String(err)}`),
        );
  }

  // VOICE_JOINED: someone back within 5 minutes cancels the count.
  async roomJoined(channelId: bigint) {
    const id = await this.sessions.activeIdOf(channelId);
    if (id === undefined) return;
    await this.sessions.transaction(async (tx) => {
      const r = await this.sessions.lock(tx, id);
      if (r?.emptySince)
        await this.sessions.save(tx, { ...r, emptySince: null });
    });
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

  private async apply(
    id: bigint,
    step: (s: RoomState, now: Date) => RoomStep,
  ): Promise<RoomView> {
    const now = this.clock.now();
    const { view, credited, changed } = await this.sessions.transaction(
      async (tx): Promise<Changed> => {
        const before = await this.sessions.lock(tx, id);
        if (!before) throw notFound();
        const { state, focus } = step(before.state, now);
        if (focus.length === 0 && isDeepStrictEqual(state, before.state))
          return {
            view: {
              record: before,
              parts: await this.sessions.participations(id, tx),
              now,
            },
            credited: new Set(),
            changed: false,
          };
        const record = { ...before, state };
        // DEC-24: everyone's focus is credited at each phase end and on pause / skip / stop.
        const credited = await this.credit(
          tx,
          await this.sessions.participations(id, tx),
          focus,
        );
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

  // Each Participation gets the part of the focus stretches it was there for (REQ-STUDY-15).
  private async credit(tx: Tx, parts: Participation[], focus: FocusInterval[]) {
    const credited = new Set<bigint>();
    if (!focus.length) return credited;
    for (const p of parts) {
      const intervals = focus.flatMap((iv) => {
        const start = p.joinedAt > iv.start ? p.joinedAt : iv.start;
        const end = p.leftAt && p.leftAt < iv.end ? p.leftAt : iv.end;
        return end > start ? [{ ...iv, start, end }] : [];
      });
      if (!intervals.length) continue;
      const days = await this.stats.credit(
        { userId: p.userId, source: 'room', intervals },
        tx,
      );
      const seconds = days.reduce((n, d) => n + d.seconds, 0);
      if (seconds > 0) {
        await this.sessions.addSeconds(tx, p.id, seconds);
        credited.add(p.userId);
      }
    }
    return credited;
  }

  // To who can view the room (CR-28 #38); every Participant gets their own copy with `me`.
  private async announce(
    { record, parts, now }: RoomView,
    t: 'FOCUS_SESSION_START' | 'FOCUS_SESSION_UPDATE',
  ) {
    const inRoom = users(parts, true);
    await this.events.toChannel(
      record.channelId,
      t,
      toFocusSessionResponse(record, null, now),
      inRoom,
    );
    for (const userId of inRoom)
      await this.events.toUser(
        userId,
        t,
        toFocusSessionResponse(
          record,
          meOf(
            record,
            parts.filter((p) => p.userId === userId),
          ),
          now,
        ),
      );
    if (record.state.status === 'running')
      await this.scheduler
        .tick(record.id, record.state.phaseEndsAt!)
        // The next control moves the session on too, so a missed job only delays the event.
        .catch((err: unknown) =>
          this.logger.error(`could not schedule ${record.id}: ${String(err)}`),
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
    for (const userId of tookPart)
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
  }
}
