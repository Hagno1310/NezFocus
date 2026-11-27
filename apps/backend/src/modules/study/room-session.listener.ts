import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  STUDY_ROOM_DELETED,
  STUDY_ROOM_DISABLED,
  type StudyRoomDeleted,
  type StudyRoomDisabled,
} from '../servers/study-room-events.js';
import {
  VOICE_JOINED,
  VOICE_LEFT,
  type VoiceLeft,
  type VoiceRoomMove,
} from '../voice/voice-events.js';
import { RoomSessionService } from './room-session.service.js';

// Room Sessions follow the room: its settings, its deletion, who sits in it.
@Injectable()
export class RoomSessionListener {
  constructor(private readonly rooms: RoomSessionService) {}

  // STUDY-11 AC7: Phòng học turned off ends the session (focus_disabled), minutes credited like Stop.
  @OnEvent(STUDY_ROOM_DISABLED, { promisify: true })
  disabled(e: StudyRoomDisabled) {
    return this.rooms.endIn(e.channelId, 'focus_disabled', e.byUserId);
  }

  // STUDY-01: a deleted channel ends its session.
  @OnEvent(STUDY_ROOM_DELETED, { promisify: true })
  deleted(e: StudyRoomDeleted) {
    return this.rooms.endIn(e.channelId, 'channel_deleted', e.byUserId);
  }

  @OnEvent(VOICE_JOINED, { promisify: true })
  joined(e: VoiceRoomMove) {
    return this.rooms.roomJoined(e.channelId);
  }

  @OnEvent(VOICE_LEFT, { promisify: true })
  left(e: VoiceLeft) {
    return this.rooms.roomLeft(e.channelId, e.at);
  }
}
