import { Injectable } from '@nestjs/common';

// For Hiếu's dialogs (REQ-ROLE-05, SRV-05, AUTH-07): the room a user sits in and what leaving it costs.
export type StudyRoomOfUser = {
  channelId: bigint;
  serverId: bigint;
  sessionId: bigint | null; // null: no Room Session runs there
  isHost: boolean;
  focusedSecondsInSession: number; // every stay added up (STUDY-01 AC10)
  // REQ-STUDY-11 "người kế tiếp": who becomes Host when this Host leaves; null when nobody qualifies.
  successorName: string | null;
};

export abstract class StudyRoomQuery {
  abstract getRoomOf(userId: bigint): Promise<StudyRoomOfUser | null>;
}

// ponytail: always null (dialogs show their plain text) until P3-B3.3 (#147) reads voice seats and Participations.
@Injectable()
export class NoStudyRoomQuery extends StudyRoomQuery {
  getRoomOf() {
    return Promise.resolve(null);
  }
}
