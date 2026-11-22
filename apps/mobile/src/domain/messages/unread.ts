import type {
  MessageAck,
  MessageCreateEvent,
  ReadState,
} from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';

// REQ-NOTIF-01, per channel. Ids are Snowflakes: compared as numbers.
export type Unread = {
  serverId: string | null; // null = DM
  lastRead: string | null; // null = nothing read
  lastMessage: string | null;
  mentions: number; // CR-12: unread messages that concern me
};
export type UnreadState = Record<string, Unread>;

export type UnreadEvent =
  | { t: 'READY'; read_states: readonly ReadState[] }
  | { t: 'MESSAGE_CREATE'; d: MessageCreateEvent }
  | { t: 'MESSAGE_ACK'; d: MessageAck };

// Snowflakes order by time; nothing yet (null) is older than anything.
export const newerId = (a: string, b: string | null | undefined) =>
  !b || BigInt(a) > BigInt(b);
const newer = (a: string | null, b: string | null) =>
  a !== null && newerId(a, b);
const max = (a: string | null, b: string | null) => (newer(a, b) ? a : b);

export const isUnread = (u: Unread | undefined) =>
  !!u && newer(u.lastMessage, u.lastRead);

export function reduceUnread(
  state: UnreadState,
  event: UnreadEvent,
  {
    myId,
    concerns,
  }: { myId: string; concerns: (m: MessageCreateEvent) => boolean },
): UnreadState {
  switch (event.t) {
    case 'READY':
      return Object.fromEntries(
        event.read_states.map((r) => [
          r.channel_id,
          {
            serverId: r.server_id,
            lastRead: r.last_read_message_id,
            lastMessage: r.last_message_id,
            mentions: r.mention_count,
          },
        ]),
      );
    case 'MESSAGE_CREATE': {
      const m = event.d;
      const u = state[m.channel_id] ?? {
        serverId: m.server_id,
        lastRead: null,
        lastMessage: null,
        mentions: 0,
      };
      const mine = m.author.id === myId;
      return {
        ...state,
        [m.channel_id]: {
          ...u,
          lastMessage: max(m.id, u.lastMessage),
          // The backend marks my own message read and sends MESSAGE_ACK; this is not to wait.
          lastRead: mine ? max(m.id, u.lastRead) : u.lastRead,
          mentions: !mine && concerns(m) ? u.mentions + 1 : u.mentions,
        },
      };
    }
    case 'MESSAGE_ACK': {
      const u = state[event.d.channel_id];
      if (!u) return state;
      return {
        ...state,
        [event.d.channel_id]: {
          ...u,
          lastRead: max(event.d.message_id, u.lastRead),
          mentions: event.d.mention_count,
        },
      };
    }
  }
}

// 02 › Dữ liệu nhất quán: rail = mentions of the server's channels (dot when only unread);
// 💬 = DMs with unread; tab Home = every server's mentions + unread DMs.
export function totals(state: UnreadState) {
  const servers: Record<string, { mentions: number; unread: boolean }> = {};
  let dms = 0;
  for (const u of Object.values(state)) {
    if (u.serverId === null) {
      if (isUnread(u)) dms++;
      continue;
    }
    const s = (servers[u.serverId] ??= { mentions: 0, unread: false });
    s.mentions += u.mentions;
    s.unread ||= isUnread(u);
  }
  const mentions = Object.values(servers).reduce((n, s) => n + s.mentions, 0);
  return { servers, dms, home: mentions + dms };
}

// Where the "Tin nhắn mới" line goes: the first message after the last read not sent by me.
export function firstUnread(
  items: readonly { id: string; authorId: string }[],
  lastRead: string | null,
  myId: string,
): string | null {
  return (
    items.find((m) => m.authorId !== myId && newer(m.id, lastRead))?.id ?? null
  );
}

export const unreadStore = createStore<UnreadState>(() => ({}));
