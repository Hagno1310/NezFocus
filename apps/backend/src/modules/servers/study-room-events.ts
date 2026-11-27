// REQ-STUDY-11: a Phòng học turned off ends its Room Session (focus_disabled); study/room-session.listener.ts listens.
export const STUDY_ROOM_DISABLED = 'study-room.disabled';

export type StudyRoomDisabled = {
  serverId: bigint;
  channelId: bigint;
  byUserId: bigint;
};

// REQ-STUDY-01: a deleted voice channel ends its Room Session (channel_deleted).
export const STUDY_ROOM_DELETED = 'study-room.deleted';
export type StudyRoomDeleted = StudyRoomDisabled;
