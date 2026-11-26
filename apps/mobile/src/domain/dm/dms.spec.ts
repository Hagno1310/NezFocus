import { describe, expect, it } from 'vitest';
import type { DmChannel, MessageResponse } from '@nezfocus/shared';
import {
  closeDm,
  dmLine2,
  emptyDms,
  reduceDms,
  sortedDms,
  type DmState,
} from './dms';

const AN = '1';

const msg = (id: string, authorId: string, content: string): MessageResponse =>
  ({
    id,
    channel_id: '0',
    author: { id: authorId, username: null, display_name: null, avatar: null },
    type: 'default',
    system_data: null,
    content,
    nonce: null,
    mention_user_ids: [],
    mention_role_ids: [],
    mention_everyone: false,
    reply_to_id: null,
    referenced_message: null,
    reactions: [],
    attachments: [],
    edited_at: null,
    pinned: false,
    created_at: '2026-10-18T13:08:00Z',
  }) as unknown as MessageResponse;

const dm = (
  id: string,
  name: string,
  last: MessageResponse | null = null,
): DmChannel => ({
  id,
  type: 'dm',
  recipient: {
    id: `9${id}`,
    username: name.toLowerCase(),
    display_name: name,
    avatar: null,
    deleted: false,
  },
  last_message_id: last?.id ?? null,
  last_message: last,
});

// Spec 09 › Dữ liệu mẫu, danh sách DM của An.
const chi = dm('50', 'Chi', msg('900', '950', 'Mai đi thư viện không?'));
const binh = dm('51', 'Bình', msg('800', AN, 'Ok 👍'));
const minh = dm('52', 'Minh', msg('100', AN, 'Cảm ơn nha'));
const lan = dm('53', 'Lan');

const ready = (dms: DmChannel[]): DmState =>
  reduceDms(emptyDms, {
    t: 'READY',
    s: 1,
    d: { private_channels: dms } as never,
  });

describe('DM list (S-DM-01, REQ-DM-03)', () => {
  it('READY fills it; newest activity first, a DM with no message by its creation', () => {
    const s = ready([minh, chi, lan, binh]);
    expect(s.loaded).toBe(true);
    expect(sortedDms(s).map((d) => d.recipient.display_name)).toEqual([
      'Chi',
      'Bình',
      'Minh',
      'Lan',
    ]);
  });

  it('a new message moves its DM to the top and becomes line 2', () => {
    const next = reduceDms(ready([chi, minh]), {
      t: 'MESSAGE_CREATE',
      s: 2,
      d: { ...msg('950', '952', 'Ê'), channel_id: '52', server_id: null },
    });
    expect(sortedDms(next).map((d) => d.id)).toEqual(['52', '50']);
    expect(next.byId['52']?.last_message?.content).toBe('Ê');
  });

  it('a server message or one of an unknown DM changes nothing (CHANNEL_CREATE brings it)', () => {
    const s = ready([chi]);
    expect(
      reduceDms(s, {
        t: 'MESSAGE_CREATE',
        s: 2,
        d: { ...msg('960', '99', 'x'), channel_id: '77', server_id: '1' },
      }),
    ).toBe(s);
    expect(
      reduceDms(s, {
        t: 'MESSAGE_CREATE',
        s: 2,
        d: { ...msg('960', '99', 'x'), channel_id: '78', server_id: null },
      }),
    ).toBe(s);
  });

  it('CHANNEL_CREATE of a DM adds or reopens it; a server channel is not ours', () => {
    const s = ready([chi]);
    const reopened = reduceDms(s, { t: 'CHANNEL_CREATE', s: 2, d: minh });
    expect(sortedDms(reopened).map((d) => d.id)).toEqual(['50', '52']);
    expect(
      reduceDms(s, {
        t: 'CHANNEL_CREATE',
        s: 2,
        d: { id: '9', server_id: '1' } as never,
      }),
    ).toBe(s);
  });

  it('an edit of the last message changes line 2; an older message edited changes nothing', () => {
    const s = ready([chi]);
    const edit = (id: string) =>
      reduceDms(s, {
        t: 'MESSAGE_UPDATE',
        s: 2,
        d: {
          id,
          channel_id: '50',
          server_id: null,
          content: 'Mai 8h đi thư viện không?',
          mention_user_ids: [],
          mention_role_ids: [],
          mention_everyone: false,
          edited_at: '2026-10-18T13:09:00.000Z',
        },
      });
    expect(edit('900').byId['50']?.last_message).toMatchObject({
      content: 'Mai 8h đi thư viện không?',
      edited_at: '2026-10-18T13:09:00.000Z',
    });
    expect(edit('899')).toBe(s);
  });

  it('a delete of the last message leaves the row without line 2, in its place', () => {
    const s = ready([chi, minh]);
    const gone = reduceDms(s, {
      t: 'MESSAGE_DELETE',
      s: 2,
      d: { id: '900', channel_id: '50', server_id: null },
    });
    expect(gone.byId['50']?.last_message).toBeNull();
    expect(sortedDms(gone).map((d) => d.id)).toEqual(['50', '52']);
    expect(
      dmLine2(gone.byId['50']!, { meId: AN, unread: false, activity: null }),
    ).toEqual({ kind: 'none' });
    expect(
      reduceDms(s, {
        t: 'MESSAGE_DELETE',
        s: 2,
        d: { id: '899', channel_id: '50', server_id: null },
      }),
    ).toBe(s);
  });

  it('DM-03: closing hides it on my side', () => {
    expect(
      sortedDms(closeDm(ready([chi, binh]), '50')).map((d) => d.id),
    ).toEqual(['51']);
  });
});

describe('DMRow line 2 (S-DM-01 › Nội dung chữ, CR-25 #16)', () => {
  const studying = { kind: 'solo' } as never;

  it('an unread message wins over activity, in bold', () => {
    expect(
      dmLine2(chi, { meId: AN, unread: true, activity: studying }),
    ).toEqual({
      kind: 'message',
      text: 'Mai đi thư viện không?',
      image: false,
      own: false,
      bold: true,
    });
  });

  it('nothing unread and they are studying → the short activity', () => {
    expect(
      dmLine2(binh, { meId: AN, unread: false, activity: studying }),
    ).toEqual({ kind: 'activity', activity: studying });
  });

  it('otherwise the last message, mine marked "Bạn: "; none → empty', () => {
    expect(dmLine2(minh, { meId: AN, unread: false, activity: null })).toEqual({
      kind: 'message',
      text: 'Cảm ơn nha',
      image: false,
      own: true,
      bold: false,
    });
    expect(dmLine2(lan, { meId: AN, unread: false, activity: null })).toEqual({
      kind: 'none',
    });
  });

  it('a last message with only images reads as an image (S-DM-01 "Đã gửi một ảnh")', () => {
    const photo = {
      ...msg('901', '950', ''),
      attachments: [{ id: '7' }],
    } as unknown as MessageResponse;
    expect(
      dmLine2(dm('54', 'Hà', photo), {
        meId: AN,
        unread: false,
        activity: null,
      }),
    ).toEqual({
      kind: 'message',
      text: '',
      image: true,
      own: false,
      bold: false,
    });
  });

  it('a deleted account never shows activity', () => {
    const gone = { ...minh, recipient: { ...minh.recipient, deleted: true } };
    expect(
      dmLine2(gone, { meId: AN, unread: false, activity: studying }).kind,
    ).toBe('message');
  });
});
