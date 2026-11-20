import {
  TYPING_CLIENT_INTERVAL_MS,
  TYPING_EXPIRE_MS,
  type TypingStart,
} from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';
import { sessionStore } from '../session/sessionStore';

export type Typer = { userId: string; name: string };

// REQ-MSG-06 AC1: a typer hides TYPING_EXPIRE_MS after their last event, or on their message.
export function createTypingStore(me: () => string) {
  const state = createStore<Record<string, Typer[]>>(() => ({}));
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  // A typing POST can lose the race to the message right after it (#109 AC1).
  const lastMessageAt = new Map<string, number>();
  const key = (channelId: string, userId: string) => `${channelId}:${userId}`;

  const remove = (channelId: string, userId: string) => {
    clearTimeout(timers.get(key(channelId, userId)));
    timers.delete(key(channelId, userId));
    const typers = state.getState()[channelId];
    if (!typers?.some((t) => t.userId === userId)) return;
    const rest = typers.filter((t) => t.userId !== userId);
    state.setState((s) => {
      const { [channelId]: _gone, ...others } = s;
      return rest.length ? { ...others, [channelId]: rest } : others;
    }, true);
  };

  return {
    state,
    started({ channel_id, user, timestamp }: TypingStart) {
      if (user.id === me()) return;
      const k = key(channel_id, user.id);
      if (Date.parse(timestamp) <= (lastMessageAt.get(k) ?? -Infinity)) return;
      clearTimeout(timers.get(k));
      timers.set(
        k,
        setTimeout(() => remove(channel_id, user.id), TYPING_EXPIRE_MS),
      );
      const typers = state.getState()[channel_id] ?? [];
      if (typers.some((t) => t.userId === user.id)) return;
      const name = user.display_name ?? user.username ?? '';
      state.setState({
        [channel_id]: [...typers, { userId: user.id, name }],
      });
    },
    messageCreated(channelId: string, userId: string, createdAt: string) {
      lastMessageAt.set(key(channelId, userId), Date.parse(createdAt));
      remove(channelId, userId);
    },
    reset() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      lastMessageAt.clear();
      state.setState({}, true);
    },
  };
}

export const typingStore = createTypingStore(
  () => sessionStore.getState().user?.id ?? '',
);

// S-HOME-01 Nội dung chữ › Typing: the i18n key and its values for these names.
export function typingLine(names: string[]) {
  if (!names.length) return null;
  if (names.length === 1)
    return { key: 'chat.typing.one', values: { name: names[0]! } } as const;
  if (names.length === 2)
    return {
      key: 'chat.typing.two',
      values: { first: names[0]!, second: names[1]! },
    } as const;
  return { key: 'chat.typing.many', values: {} } as const;
}

// DEC-33 / #109 AC3: at most once per channel per interval, for a changed non-empty draft, online.
export function createTypingSender(deps: {
  post: (channelId: string) => Promise<void>;
  online: () => boolean;
  now: () => number;
}) {
  const last = new Map<string, number>();
  return (channelId: string, text: string, previous: string) => {
    if (!text || text === previous || !deps.online()) return;
    const at = deps.now();
    if (at - (last.get(channelId) ?? -Infinity) < TYPING_CLIENT_INTERVAL_MS)
      return;
    last.set(channelId, at);
    // Typing is best effort: a lost call only means a late "đang nhập…".
    deps.post(channelId).catch(() => {});
  };
}
