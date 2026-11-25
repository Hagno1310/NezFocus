import type { LookupRelationship, StudyActivity } from '@nezfocus/shared';

const BANDS = 6;

// S-HOME-10 default background (C-41): one of six tones, fixed per person by id.
export const profileBand = (userId: string, deleted: boolean) =>
  deleted
    ? ('surface-3' as const)
    : (`profile-bg-${Number(BigInt(userId) % BigInt(BANDS)) + 1}` as
        | 'profile-bg-1'
        | 'profile-bg-2'
        | 'profile-bg-3'
        | 'profile-bg-4'
        | 'profile-bg-5'
        | 'profile-bg-6');

export type ProfileView = {
  message: 'primary' | 'secondary' | 'disabled' | null; // "Nhắn tin"
  relation:
    | { kind: 'button'; action: 'add' | 'accept' }
    | { kind: 'chip'; chip: 'friend' | 'sent' | 'blocked' }
    | null;
  menu: boolean; // ⋯
  edit: boolean; // "Sửa hồ sơ" (self)
  activity: boolean; // C-40 block
  note: 'cannot-message' | null;
  dot: boolean;
  requestNote: boolean; // "{Tên} muốn kết bạn với bạn"
};

const nothing: ProfileView = {
  message: null,
  relation: null,
  menu: false,
  edit: false,
  activity: false,
  note: null,
  dot: true,
  requestNote: false,
};

// S-HOME-10 › Trạng thái (REQ-FRIEND-02 CR-25 #10: the relation is a button only to add /
// accept; everything else is a label, the rest lives in ⋯).
export function profileView(o: {
  self: boolean;
  deleted: boolean;
  relationship: LookupRelationship;
  canMessage: boolean;
  inServer: boolean;
  fromTheirDm: boolean; // AUTH-06 AC5: no "Nhắn tin" from their own DM
  activity: StudyActivity | null;
}): ProfileView {
  if (o.deleted) return { ...nothing, dot: false };
  if (o.self) return { ...nothing, edit: true };
  if (o.relationship === 'blocked')
    return {
      ...nothing,
      relation: { kind: 'chip', chip: 'blocked' },
      menu: true,
    };
  const relation: ProfileView['relation'] =
    o.relationship === 'none'
      ? { kind: 'button', action: 'add' }
      : o.relationship === 'incoming'
        ? { kind: 'button', action: 'accept' }
        : {
            kind: 'chip',
            chip: o.relationship === 'friend' ? 'friend' : 'sent',
          };
  const message: ProfileView['message'] = o.fromTheirDm
    ? null
    : !o.canMessage
      ? 'disabled'
      : o.relationship === 'incoming'
        ? 'secondary'
        : 'primary';
  return {
    message,
    relation,
    menu: true,
    edit: false,
    // CR-24: hidden on every 40303 screen.
    activity: !!o.activity && o.canMessage,
    note: o.canMessage ? null : 'cannot-message',
    // Spec 09: a 40303 screen hides the dot; inside a server the member list shows it anyway.
    dot: o.canMessage || o.inServer,
    requestNote: o.relationship === 'incoming',
  };
}
