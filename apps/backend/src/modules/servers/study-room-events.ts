// REQ-STUDY-11: a Phòng học turned off ends its Room Session (focus_disabled); P3-B3.2 (#146) listens.
export const STUDY_ROOM_DISABLED = 'study-room.disabled';

export type StudyRoomDisabled = {
  serverId: bigint;
  channelId: bigint;
  byUserId: bigint;
};
