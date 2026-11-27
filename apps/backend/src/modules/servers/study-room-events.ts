// REQ-STUDY-11: a Phòng học turned off ends its Room Session (end_reason = focus_disabled).
// Emitted after the channel is saved; the Room Session side (P3-B3.2 #146) listens with
// @OnEvent and ends the session once, so the servers module never calls into study.
export const STUDY_ROOM_DISABLED = 'study-room.disabled';

export type StudyRoomDisabled = {
  serverId: bigint;
  channelId: bigint;
  byUserId: bigint;
};
