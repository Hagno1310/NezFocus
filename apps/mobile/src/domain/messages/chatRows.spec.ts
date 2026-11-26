import type { MessageResponse } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  chatRows,
  composerCount,
  itemKey,
  messageToSend,
  newBelow,
  type ChatRow,
} from './chatRows';
import type { ChatItem } from './messageStore';
import type { OutboxEntry } from './outbox';

const TZ = 'Asia/Ho_Chi_Minh';
// 02 › Dữ liệu mẫu: 20:12, Chủ Nhật 18/10/2026 (GMT+7).
const at = (day: number, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return Date.UTC(2026, 9, day, h! - 7, m!);
};
const NOW = at(18, '20:12');
const AN = '1';

let seq = 0;
const sent = (
  author: string,
  day: number,
  hhmm: string,
  over: Partial<MessageResponse> = {},
): ChatItem => ({
  kind: 'message',
  message: {
    id: String(++seq),
    channel_id: '7',
    author: { id: author, username: null, display_name: null, avatar: null },
    type: 'default',
    content: 'x',
    nonce: null,
    mention_user_ids: [],
    mention_role_ids: [],
    mention_everyone: false,
    system_data: null,
    reply_to_id: null,
    referenced_message: null,
    reactions: [],
    edited_at: null,
    pinned_at: null,
    created_at: new Date(at(day, hhmm)).toISOString(),
    ...over,
  } as MessageResponse,
});

const queued = (day: number, hhmm: string, nonce = `n${++seq}`): ChatItem => {
  const entry: OutboxEntry = {
    nonce,
    channelId: '7',
    serverId: '100',
    content: 'x',
    status: 'pending',
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    createdAt: at(day, hhmm),
    queuedAt: at(day, hhmm),
  };
  return { kind: 'outbox', entry };
};

const rows = (items: ChatItem[]) =>
  chatRows(items, { now: NOW, timeZone: TZ, myId: AN });

const heads = (r: ChatRow[]) =>
  r.map((x) => (x.kind === 'message' ? x.head : x.kind));

describe('chatRows: gộp nhóm (v1.9, CR-19 #13)', () => {
  it('counts the 5 minutes from the head of the group: 21:07, 21:10 | 21:13, 21:16', () => {
    const r = rows(
      ['21:07', '21:10', '21:13', '21:16'].map((t) => sent('2', 18, t)),
    );
    expect(heads(r)).toEqual(['day', true, false, true, false]);
  });

  it('exactly 5 minutes after the head still groups', () => {
    expect(
      heads(rows([sent('2', 18, '20:00'), sent('2', 18, '20:05')])),
    ).toEqual(['day', true, false]);
  });

  it('another sender starts a new group', () => {
    const r = rows([sent('2', 18, '20:02'), sent('3', 18, '20:03')]);
    expect(heads(r)).toEqual(['day', true, true]);
  });

  it('a system message is never grouped and breaks the group around it', () => {
    const r = rows([
      sent('2', 18, '20:00'),
      sent('2', 18, '20:01', {
        type: 'member_join',
        system_data: { user_id: '2' },
      } as Partial<MessageResponse>),
      sent('2', 18, '20:02'),
    ]);
    expect(heads(r)).toEqual(['day', true, 'system', true]);
  });

  it('my outbox entries group with my sent messages (message-states)', () => {
    const r = rows([
      sent(AN, 18, '20:11'),
      queued(18, '20:11'),
      queued(18, '20:12'),
    ]);
    expect(heads(r)).toEqual(['day', true, false, false]);
  });

  it('an unsent message older than the one above it shows its own time', () => {
    const r = rows([sent(AN, 18, '20:11'), queued(18, '20:03')]);
    expect(heads(r)).toEqual(['day', true, true]);
  });

  it('two messages either side of midnight are not grouped (Edge case "Qua nửa đêm")', () => {
    const r = rows([sent('2', 17, '23:58'), sent('2', 18, '00:01')]);
    expect(heads(r)).toEqual(['day', true, 'day', true]);
  });
});

describe('chatRows: vạch ngày và giờ đầu tin', () => {
  it('"Hôm nay" / "Hôm qua" / "Thứ Năm, 15/10/2026"', () => {
    const r = rows([
      sent('2', 15, '21:15'),
      sent('2', 17, '21:05'),
      sent('2', 18, '20:02'),
    ]).filter((x) => x.kind === 'day');
    expect(r.map((x) => x.day)).toEqual([
      { kind: 'date', weekday: 4, date: '15/10/2026' },
      { kind: 'yesterday' },
      { kind: 'today' },
    ]);
  });

  it('times read "20:02", "Hôm qua 21:05", "16/10/2026 20:00"', () => {
    const r = rows([
      sent('2', 16, '20:00'),
      sent('2', 17, '21:05'),
      sent('2', 18, '20:02'),
    ]).flatMap((x) => (x.kind === 'message' ? [x.time] : []));
    expect(r).toEqual([
      { kind: 'date', date: '16/10/2026', time: '20:00' },
      { kind: 'yesterday', time: '21:05' },
      { kind: 'today', time: '20:02' },
    ]);
  });

  it('follows the user time zone, not UTC: 00:30 GMT+7 is the 18th', () => {
    const r = rows([sent('2', 18, '00:30')]);
    expect(r[0]).toMatchObject({ kind: 'day', day: { kind: 'today' } });
  });

  it('after midnight the same message reads as yesterday', () => {
    const items = [sent('2', 18, '20:02')];
    const later = chatRows(items, {
      now: at(19, '00:05'),
      timeZone: TZ,
      myId: AN,
    });
    expect(
      later.map((x) =>
        x.kind === 'day' ? x.day : x.kind === 'message' && x.time,
      ),
    ).toEqual([{ kind: 'yesterday' }, { kind: 'yesterday', time: '20:02' }]);
  });

  it('an outbox entry is mine, dated when it was written', () => {
    const [, row] = rows([queued(18, '20:12')]);
    expect(row).toMatchObject({
      kind: 'message',
      authorId: AN,
      time: { kind: 'today', time: '20:12' },
    });
  });
});

describe('itemKey', () => {
  it('a sent message keeps the key of its pending copy, so the row does not jump (MSG-09 AC3)', () => {
    const pending = queued(18, '20:12', 'abc');
    const echo = sent(AN, 18, '20:12', { nonce: 'abc' });
    expect(itemKey(echo)).toBe(itemKey(pending));
  });

  it('without a nonce it is the message id', () => {
    const m = sent('2', 18, '20:02');
    expect(itemKey(m)).toBe(
      m.kind === 'message' ? `m${m.message.id}` : 'never',
    );
  });
});

describe('newBelow: "N tin mới ↓" (scrolled-up)', () => {
  const list = [
    sent('2', 18, '20:00'),
    sent('3', 18, '20:01'),
    sent(AN, 18, '20:02'),
    sent('4', 18, '20:03'),
  ];

  it('counts what others sent after the last row seen', () => {
    expect(newBelow(list, itemKey(list[0]!), AN)).toBe(2);
  });

  it('nothing new when the last row seen is the last one', () => {
    expect(newBelow(list, itemKey(list[3]!), AN)).toBe(0);
  });

  it('an unknown anchor (pruned) counts nothing rather than everything', () => {
    expect(newBelow(list, 'gone', AN)).toBe(0);
  });
});

describe('composerCount (MSG-01 AC5, C-11 bộ đếm)', () => {
  it('no counter while more than 200 are left', () => {
    expect(composerCount('a'.repeat(1799))).toEqual({
      counter: null,
      canSend: true,
    });
  });

  it('"còn N" from 200 left', () => {
    expect(composerCount('a'.repeat(1800)).counter).toEqual({
      kind: 'left',
      n: 200,
    });
    expect(composerCount('a'.repeat(1880)).counter).toEqual({
      kind: 'left',
      n: 120,
    });
  });

  it('2000 exactly can be sent; 2012 cannot and shows −12', () => {
    expect(composerCount('a'.repeat(2000))).toEqual({
      counter: { kind: 'left', n: 0 },
      canSend: true,
    });
    expect(composerCount('a'.repeat(2012))).toEqual({
      counter: { kind: 'over', n: 12 },
      canSend: false,
    });
  });

  it('counts after NFC, as the backend: "e" + combining acute is one', () => {
    const decomposed = 'é'.repeat(2000);
    expect(decomposed.length).toBe(4000);
    expect(composerCount(decomposed).canSend).toBe(true);
  });

  it('counts code points: an emoji is one', () => {
    expect(composerCount('😀'.repeat(2001)).counter).toEqual({
      kind: 'over',
      n: 1,
    });
  });

  it('counts what is sent: spaces and new lines around the text are dropped', () => {
    expect(
      composerCount(`${'a'.repeat(1990)}\n\n\n\n\n\n\n\n\n\n\n\n`),
    ).toEqual({
      counter: { kind: 'left', n: 10 },
      canSend: true,
    });
    expect(messageToSend('\n  câu 3 \n')).toBe('câu 3');
  });

  it('blank text cannot be sent and shows nothing', () => {
    expect(composerCount('  \n ')).toEqual({ counter: null, canSend: false });
  });
});

describe('chatRows: system messages and blocked senders (P2-A4.3)', () => {
  const opts = { now: NOW, timeZone: TZ, myId: AN };
  const shape = (rows: ChatRow[]) =>
    rows.map((r) =>
      r.kind === 'day'
        ? 'day'
        : r.kind === 'blocked'
          ? `blocked ${r.count}`
          : r.kind === 'message'
            ? `${r.kind} ${r.head ? 'head' : 'grouped'}`
            : r.kind,
    );

  it('MSG-11: a member_join is its own row and ends a group', () => {
    const rows = chatRows(
      [
        sent('2', 18, '19:56'),
        sent('4', 18, '19:58', {
          type: 'member_join',
          system_data: { user_id: '4' },
        } as Partial<MessageResponse>),
        sent('2', 18, '19:59'),
      ],
      opts,
    );
    expect(shape(rows)).toEqual([
      'day',
      'message head',
      'system',
      'message head',
    ]);
  });

  it('FRIEND-03 AC2: consecutive messages of blocked people fold into one row', () => {
    const items = [
      sent('2', 18, '20:02'),
      sent('9', 18, '20:03'),
      sent('9', 18, '20:04'),
      sent('8', 18, '20:05'),
      sent('2', 18, '20:06'),
    ];
    const blocked = new Set(['8', '9']);
    const rows = chatRows(items, { ...opts, blocked });
    expect(shape(rows)).toEqual([
      'day',
      'message head',
      'blocked 3',
      'message head',
    ]);
    // "Hiện" opens that run in place.
    const key = rows.find((r) => r.kind === 'blocked')!.key;
    expect(
      shape(chatRows(items, { ...opts, blocked, revealed: new Set([key]) })),
    ).toEqual([
      'day',
      'message head',
      'message head',
      'message grouped',
      'message head',
      'message head',
    ]);
  });
});

describe('chatRows: "Tin nhắn mới" line (NOTIF-01, P2-A4.4)', () => {
  it('goes right before the first unread message and starts a new group', () => {
    const items = [
      sent('2', 18, '20:02'),
      sent('2', 18, '20:03'),
      sent('2', 18, '20:04'),
    ];
    const first = (items[1] as Extract<ChatItem, { kind: 'message' }>).message
      .id;
    const rows = chatRows(items, {
      now: NOW,
      timeZone: TZ,
      myId: AN,
      newFrom: first,
    });
    expect(rows.map((r) => (r.kind === 'message' ? r.head : r.kind))).toEqual([
      'day',
      true,
      'new',
      true,
      false,
    ]);
  });
});
