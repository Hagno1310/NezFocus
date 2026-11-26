import { describe, expect, it } from 'vitest';
import { messageSheet, type SheetViewer } from './messageActions';

const member: SheetViewer = {
  inDm: false,
  canManage: false,
  canReact: true,
  timedOut: false,
  online: true,
};
const text = { mine: false, system: false, hasText: true };
const rowsOf = (s: ReturnType<typeof messageSheet>) =>
  s?.rows.map((r) => r.row);

// S-HOME-04 › Trạng thái, and the chốt of 26/11/2026 (offline, ADD_REACTIONS, timed out).
describe('messageSheet', () => {
  it('own-message (a plain member): reactions · Trả lời · Sửa · Sao chép văn bản · Xóa', () => {
    const s = messageSheet({ ...text, mine: true }, member);
    expect(s?.reactions).toBe('on');
    expect(rowsOf(s)).toEqual([
      'reply',
      'edit',
      'copyText',
      'copyLink',
      'delete',
    ]);
  });

  it('others-message: no copy row without text; Báo cáo, no Xóa', () => {
    expect(rowsOf(messageSheet({ ...text, hasText: false }, member))).toEqual([
      'reply',
      'copyLink',
      'report',
    ]);
  });

  it('moderator: Ghim and Xóa on someone else’s message', () => {
    expect(rowsOf(messageSheet(text, { ...member, canManage: true }))).toEqual([
      'reply',
      'pin',
      'copyText',
      'copyLink',
      'report',
      'delete',
    ]);
  });

  it('system-message: only Xóa with MANAGE_MESSAGES, no reactions; else no sheet; never in a DM', () => {
    const system = { ...text, system: true };
    const s = messageSheet(system, { ...member, canManage: true });
    expect(s?.reactions).toBe('off');
    expect(rowsOf(s)).toEqual(['delete']);
    expect(messageSheet(system, member)).toBeNull();
    expect(messageSheet(system, { ...member, inDm: true })).toBeNull();
  });

  it('timed-out: copy and Báo cáo, own message also Xóa; no reactions, no Trả lời', () => {
    const timedOut = { ...member, timedOut: true };
    const s = messageSheet(text, timedOut);
    expect(s?.reactions).toBe('off');
    expect(rowsOf(s)).toEqual(['copyText', 'copyLink', 'report']);
    expect(rowsOf(messageSheet({ ...text, mine: true }, timedOut))).toEqual([
      'copyText',
      'copyLink',
      'delete',
    ]);
  });

  it('no ADD_REACTIONS: no quick row (chips already there still work)', () => {
    expect(messageSheet(text, { ...member, canReact: false })?.reactions).toBe(
      'off',
    );
  });

  it('DM: only the author deletes; reactions on', () => {
    const dm = { ...member, inDm: true, canReact: false, canManage: false };
    expect(messageSheet(text, dm)?.reactions).toBe('on');
    expect(rowsOf(messageSheet(text, dm))).not.toContain('delete');
    expect(rowsOf(messageSheet({ ...text, mine: true }, dm))).toContain(
      'delete',
    );
  });

  it('offline: reactions, Sửa, Xóa, Báo cáo disabled; Trả lời and copy still work', () => {
    const s = messageSheet(
      { ...text, mine: true },
      { ...member, online: false },
    );
    expect(s?.reactions).toBe('disabled');
    expect(s?.rows).toEqual([
      { row: 'reply', disabled: false },
      { row: 'edit', disabled: true },
      { row: 'copyText', disabled: false },
      { row: 'copyLink', disabled: false },
      { row: 'delete', disabled: true },
    ]);
  });
});

describe('messageSheet pins (REQ-MSG-10, CR-28 #28)', () => {
  const moderator = { ...member, canManage: true };

  it('AC3: a member without MANAGE_MESSAGES has no Ghim row', () => {
    expect(rowsOf(messageSheet(text, member))).not.toContain('pin');
  });

  it('own-message with MANAGE_MESSAGES: Ghim after Sửa; a pinned one says Bỏ ghim', () => {
    expect(
      rowsOf(messageSheet({ ...text, mine: true }, moderator))?.slice(0, 3),
    ).toEqual(['reply', 'edit', 'pin']);
    expect(
      rowsOf(messageSheet({ ...text, pinned: true }, moderator)),
    ).toContain('unpin');
  });

  it('AC4: anyone in a DM pins', () => {
    expect(rowsOf(messageSheet(text, { ...member, inDm: true }))).toContain(
      'pin',
    );
  });

  it('not on a system message, not while timed out; offline disabled', () => {
    expect(rowsOf(messageSheet({ ...text, system: true }, moderator))).toEqual([
      'delete',
    ]);
    expect(
      rowsOf(messageSheet(text, { ...moderator, timedOut: true })),
    ).not.toContain('pin');
    expect(
      messageSheet(text, { ...moderator, online: false })?.rows.find(
        (r) => r.row === 'pin',
      ),
    ).toEqual({ row: 'pin', disabled: true });
  });
});
