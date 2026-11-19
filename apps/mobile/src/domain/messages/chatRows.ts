import { MESSAGE_MAX_CHARS, countMessageChars } from '@nezfocus/shared';
import { lastActive, type LastActive } from '../account/sessions';
import { localTime } from '../study/stats';
import type { ChatItem } from './messageStore';

const GROUP_MS = 5 * 60 * 1000;
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
    };

// MSG-09 AC3: the sent copy takes its pending copy's key, so the row is updated, not replaced.
export const itemKey = (item: ChatItem) =>
  item.kind === 'outbox'
    ? `n${item.entry.nonce}`
    : item.message.nonce
      ? `n${item.message.nonce}`
      : `m${item.message.id}`;

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

// S-HOME-01 list, oldest first: date dividers and groups (02 › Dữ liệu nhất quán, v1.9 CR-19
// #13): same sender, within 5 minutes of the group's first message, nothing in between.
export function chatRows(
  items: readonly ChatItem[],
  { now, timeZone, myId }: { now: number; timeZone: string; myId: string },
): ChatRow[] {
  const rows: ChatRow[] = [];
  let day: string | null = null;
  let group: { author: string; at: number } | null = null;
  for (const item of items) {
    const at = timeOf(item);
    const date = localTime(new Date(at).toISOString(), timeZone).date;
    if (date !== day) {
      day = date;
      group = null;
      rows.push({
        kind: 'day',
        key: `d${date}`,
        day: dayLabel(date, now, timeZone),
      });
    }
    const author = authorOf(item, myId);
    const head =
      !group ||
      group.author !== author ||
      at - group.at > GROUP_MS ||
      isSystem(item);
    if (head) group = isSystem(item) ? null : { author, at };
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

export type Counter = { kind: 'left' | 'over'; n: number };

// MSG-01 AC5 (C-11 bộ đếm): counted as the backend counts; pasted text is never cut.
export function composerCount(text: string): {
  counter: Counter | null;
  canSend: boolean;
} {
  const count = countMessageChars(text);
  const left = MESSAGE_MAX_CHARS - count;
  const blank = text.trim() === '';
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
