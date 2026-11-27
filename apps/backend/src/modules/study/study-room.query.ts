import { Injectable } from '@nestjs/common';
import { myFocusedSeconds } from '@nezfocus/shared';
import { Clock } from '../../common/clock.js';
import { VoiceService } from '../voice/voice.service.js';
import { meOf } from './room-session.dto.js';
import { RoomSessionRepository } from './room-session.repository.js';
import { RoomSessionService } from './room-session.service.js';

// For Hiếu's dialogs (REQ-ROLE-05, SRV-05, AUTH-07): the room a user sits in and what leaving it costs.
export type StudyRoomOfUser = {
  channelId: bigint;
  serverId: bigint;
  sessionId: bigint | null; // null: no Room Session runs there
  isHost: boolean;
  focusedSecondsInSession: number; // every stay added up, the running part included (STUDY-01 AC10)
  // REQ-STUDY-11 "người kế tiếp": who becomes Host when this Host leaves; null when nobody qualifies.
  successorName: string | null;
};

export abstract class StudyRoomQuery {
  abstract getRoomOf(userId: bigint): Promise<StudyRoomOfUser | null>;
}

@Injectable()
export class LiveStudyRoomQuery extends StudyRoomQuery {
  constructor(
    private readonly voice: VoiceService,
    private readonly sessions: RoomSessionRepository,
    private readonly rooms: RoomSessionService,
    private readonly clock: Clock,
  ) {
    super();
  }

  async getRoomOf(userId: bigint): Promise<StudyRoomOfUser | null> {
    const seat = await this.voice.seatOf(userId);
    if (!seat) return null;
    const room = { channelId: seat.channelId, serverId: seat.serverId };
    const id = await this.sessions.activeIdOf(seat.channelId);
    const record = id === undefined ? undefined : await this.sessions.find(id);
    if (!record)
      return {
        ...room,
        sessionId: null,
        isHost: false,
        focusedSecondsInSession: 0,
        successorName: null,
      };
    const mine = (await this.sessions.participations(record.id)).filter(
      (p) => p.userId === userId,
    );
    const me = meOf(record, mine);
    const isHost = record.hostId === userId;
    const others = (await this.voice.occupants(seat.channelId)).filter(
      (o) => o.userId !== userId,
    );
    const successor = isHost
      ? await this.rooms.successor(seat.channelId, others)
      : null;
    return {
      ...room,
      sessionId: record.id,
      isHost,
      focusedSecondsInSession:
        myFocusedSeconds(
          {
            me,
            phase_ends_at: record.state.phaseEndsAt?.toISOString() ?? null,
          },
          0,
          this.clock.now().getTime(),
        ) ?? 0,
      successorName:
        successor === null ? null : await this.sessions.nameOf(successor),
    };
  }
}
