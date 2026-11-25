import { describe, expect, it } from 'vitest';
import { profileBand, profileView } from './profileView';

const studying = { kind: 'solo' } as never;
const base = {
  self: false,
  deleted: false,
  relationship: 'none' as const,
  canMessage: true,
  inServer: true,
  fromTheirDm: false,
  activity: null,
};

// S-HOME-10 › Trạng thái (spec 02; REQ-FRIEND-02 / 03, AUTH-06 v1.9; chốt 25/11/2026).
describe('S-HOME-10', () => {
  it('not-friend: Nhắn tin · Kết bạn · ⋯', () => {
    expect(profileView(base)).toEqual({
      message: 'primary',
      relation: { kind: 'button', action: 'add' },
      menu: true,
      edit: false,
      activity: false,
      note: null,
      dot: true,
      requestNote: false,
    });
  });

  it('friend / request-sent: the relation is a ChipStatus, not a button', () => {
    expect(profileView({ ...base, relationship: 'friend' }).relation).toEqual({
      kind: 'chip',
      chip: 'friend',
    });
    expect(profileView({ ...base, relationship: 'outgoing' }).relation).toEqual(
      { kind: 'chip', chip: 'sent' },
    );
  });

  it('request-received: "Chấp nhận" primary, "Nhắn tin" secondary, the note above', () => {
    const v = profileView({ ...base, relationship: 'incoming' });
    expect([v.message, v.relation, v.requestNote]).toEqual([
      'secondary',
      { kind: 'button', action: 'accept' },
      true,
    ]);
  });

  it('activity block only while studying and visible', () => {
    expect(profileView({ ...base, activity: studying }).activity).toBe(true);
  });

  it('blocked: no Nhắn tin, no Kết bạn, no activity; chip "Đã chặn" and ⋯', () => {
    expect(
      profileView({ ...base, relationship: 'blocked', activity: studying }),
    ).toMatchObject({
      message: null,
      relation: { kind: 'chip', chip: 'blocked' },
      menu: true,
      activity: false,
    });
  });

  it('cannot-message (40303): Nhắn tin disabled + the sentence, no activity, still Kết bạn · ⋯', () => {
    expect(
      profileView({ ...base, canMessage: false, activity: studying }),
    ).toMatchObject({
      message: 'disabled',
      relation: { kind: 'button', action: 'add' },
      menu: true,
      activity: false,
      note: 'cannot-message',
      dot: true,
    });
  });

  it('cannot-message outside a server hides the dot (chốt 25/11/2026)', () => {
    expect(
      profileView({ ...base, canMessage: false, inServer: false }).dot,
    ).toBe(false);
  });

  it('AUTH-06 AC5: opened from their own DM → no Nhắn tin', () => {
    expect(
      profileView({
        ...base,
        relationship: 'friend',
        inServer: false,
        fromTheirDm: true,
      }).message,
    ).toBeNull();
  });

  it('self: only "Sửa hồ sơ", no ⋯, no activity', () => {
    expect(profileView({ ...base, self: true, activity: studying })).toEqual({
      message: null,
      relation: null,
      menu: false,
      edit: true,
      activity: false,
      note: null,
      dot: true,
      requestNote: false,
    });
  });

  it('deleted: nothing but the name', () => {
    expect(profileView({ ...base, deleted: true })).toEqual({
      message: null,
      relation: null,
      menu: false,
      edit: false,
      activity: false,
      note: null,
      dot: false,
      requestNote: false,
    });
  });
});

describe('S-HOME-10 default background (C-41)', () => {
  it('the same person always gets the same of six tones; a deleted account is neutral', () => {
    expect(profileBand('12', false)).toBe('profile-bg-1');
    expect(profileBand('17', false)).toBe('profile-bg-6');
    expect(profileBand('17', false)).toBe(profileBand('17', false));
    expect(profileBand('17', true)).toBe('surface-3');
  });
});
