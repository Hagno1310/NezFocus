import { MESSAGE_MAX_CHARS, countMessageChars } from '@nezfocus/shared';
import { lastActive, type LastActive } from '../account/sessions';
import { localTime } from '../study/stats';
import type { ChatItem } from './messageStore';

const GROUP_MS = 5 * 60 * 1000;
const NONE: ReadonlySet<string> = new Set();
const DAY_MS = 24 * 60 * 60 * 1000;
const COUNTER_FROM = 200;

export type DayLabel =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'date'; weekday: number; date: string }; // "Thứ Năm, 15/10/2026"

export type ChatRow =
  | { kind: 'day'; key: string; day: DayLabel }
  | {
      kind: 'message';
      key: string;
      item: ChatItem;
      authorId: string;
      head: boolean; // first of its group: avatar, name and time
      time: LastActive; // also read out for a grouped message (C-10 accessibility)
    }
  // C-10 `system` (REQ-MSG-11): no avatar, never grouped.
  | {
      kind: 'system';
      key: string;
      message: Extract<ChatItem, { kind: 'message' }>['message'];
      time: LastActive;
    }
  // C-10 `blocked` (FRIEND-03 AC2): a run of messages from people I blocked, folded.
  | { kind: 'blocked'; key: string; count: number; lastId: string | null }
  // Divider/new "Tin nhắn mới" (NOTIF-01): before the first unread message; cuts the group.
  | { kind: 'new'; key: 'new' };

// MSG-09 AC3: the sent copy takes its pending copy's key, so the row is updated, not replaced.
export const itemKey = (item: ChatItem) =>
  item.kind === 'outbox'
    ? `n${item.entry.nonce}`
    : item.message.nonce
      ? `n${item.message.nonce}`
      : `m${item.message.id}`;

export const contentOf = (item: ChatItem) =>
  item.kind === 'outbox' ? item.entry.content : item.message.content;

const authorOf = (item: ChatItem, myId: string) =>
  item.kind === 'outbox' ? myId : item.message.author.id;

const timeOf = (item: ChatItem) =>
  item.kind === 'outbox'
    ? item.entry.createdAt
    : Date.parse(item.message.created_at);

const isSystem = (item: ChatItem) =>
  item.kind === 'message' && item.message.type !== 'default';

function dayLabel(date: string, now: number, timeZone: string): DayLabel {
  const dayOf = (ms: number) =>
    localTime(new Date(ms).toISOString(), timeZone).date;
  if (date === dayOf(now)) return { kind: 'today' };
  if (date === dayOf(now - DAY_MS)) return { kind: 'yesterday' };
  const [y, m, d] = date.split('-').map(Number);
  return {
    kind: 'date',
    weekday: new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay(),
    date: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
  };
}

// 02 › Dữ liệu nhất quán (CR-19): a group = same sender, ≤ 5 min from its first, nothing between.
export function chatRows(
  items: readonly ChatItem[],
  {
    now,
    timeZone,
    myId,
    blocked = NONE,
    revealed = NONE,
    newFrom = null,
  }: {
    now: number;
    timeZone: string;
    myId: string;
    blocked?: ReadonlySet<string>; // author ids
    revealed?: ReadonlySet<string>; // keys of folded runs opened with "Hiện"
    newFrom?: string | null; // id of the first unread message
  },
): ChatRow[] {
  const rows: ChatRow[] = [];
  let day: string | null = null;
  let group: { author: string; at: number } | null = null;
  let fold: { key: string; open: boolean } | null = null;
  for (const item of items) {
    const at = timeOf(item);
    const date = localTime(new Date(at).toISOString(), timeZone).date;
    // Days only move forward: my outbox sits below the sent messages, so one written yesterday
    // and sent today stays under today's divider (its own time still says "Hôm qua").
    if (day === null || date > day) {
      day = date;
      group = null;
      rows.push({
        kind: 'day',
        key: `d${date}`,
        day: dayLabel(date, now, timeZone),
      });
    }
    if (item.kind === 'message' && item.message.id === newFrom) {
      rows.push({ kind: 'new', key: 'new' });
      group = null;
      fold = null;
    }
    const author = authorOf(item, myId);
    if (blocked.has(author) && !isSystem(item)) {
      fold ??= { key: `b${itemKey(item)}`, open: false };
      fold.open = revealed.has(fold.key);
      const last = rows.at(-1);
      if (!fold.open) {
        const id = item.kind === 'message' ? item.message.id : null;
        if (last?.kind === 'blocked' && last.key === fold.key) {
          last.count++;
          last.lastId = id ?? last.lastId;
        } else
          rows.push({ kind: 'blocked', key: fold.key, count: 1, lastId: id });
        group = null;
        continue;
      }
    } else fold = null;
    if (isSystem(item) && item.kind === 'message') {
      group = null;
      rows.push({
        kind: 'system',
        key: itemKey(item),
        message: item.message,
        time: lastActive(new Date(at).toISOString(), now, timeZone),
      });
      continue;
    }
    const reply =
      item.kind === 'message'
        ? item.message.reply_to_id !== null
        : item.entry.replyToId !== null;
    const head =
      !group ||
      // C-10 `reply`: the reply line sits above the name, so a reply starts its own group.
      reply ||
      group.author !== author ||
      // Outbox entries sit below sent messages, so one can be older than the group head.
      at < group.at ||
      at - group.at > GROUP_MS;
    if (head) group = { author, at };
    rows.push({
      kind: 'message',
      key: itemKey(item),
      item,
      authorId: author,
      head,
      time: lastActive(new Date(at).toISOString(), now, timeZone),
    });
  }
  return rows;
}

// `scrolled-up` "3 tin mới": what others sent below the last row seen at the bottom.
export function newBelow(
  items: readonly ChatItem[],
  lastSeenKey: string,
  myId: string,
): number {
  const i = items.findIndex((x) => itemKey(x) === lastSeenKey);
  if (i < 0) return 0;
  return items.slice(i + 1).filter((x) => authorOf(x, myId) !== myId).length;
}

// What ➤ sends, and so what the counter counts.
export const messageToSend = (text: string) => text.trim();

export type Counter = { kind: 'left' | 'over'; n: number };

// MSG-01 AC5 (C-11 bộ đếm): counted as the backend counts; pasted text is never cut.
export function composerCount(text: string): {
  counter: Counter | null;
  canSend: boolean;
} {
  const sent = messageToSend(text);
  const left = MESSAGE_MAX_CHARS - countMessageChars(sent);
  const blank = sent === '';
  return {
    counter:
      blank || left > COUNTER_FROM
        ? null
        : left < 0
          ? { kind: 'over', n: -left }
          : { kind: 'left', n: left },
    canSend: !blank && left >= 0,
  };
}
