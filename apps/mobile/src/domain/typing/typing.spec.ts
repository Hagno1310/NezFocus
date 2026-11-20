import type { TypingStart } from '@nezfocus/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTypingSender, createTypingStore, typingLine } from './typing';

const ME = '1';
const start = (
  userId: string,
  name: string | null,
  channelId = '7',
): TypingStart => ({
  channel_id: channelId,
  server_id: '100',
  user: {
    id: userId,
    username: `u${userId}`,
    display_name: name,
    avatar: null,
  },
  timestamp: '2026-11-20T08:00:00.000Z',
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('typing store (REQ-MSG-06 AC1)', () => {
  const names = (s: ReturnType<typeof createTypingStore>, channelId = '7') =>
    (s.state.getState()[channelId] ?? []).map((t) => t.name);

  it('shows who types, hides them 10 s after their last event', () => {
    const s = createTypingStore(() => ME);
    s.started(start('3', 'Chi'));
    vi.advanceTimersByTime(9_000);
    s.started(start('3', 'Chi')); // the next call, 8 s later, restarts the 10 s
    vi.advanceTimersByTime(9_999);
    expect(names(s)).toEqual(['Chi']);
    vi.advanceTimersByTime(1);
    expect(names(s)).toEqual([]);
  });

  it('hides a typer as soon as their message arrives', () => {
    const s = createTypingStore(() => ME);
    s.started(start('3', 'Chi'));
    s.started(start('4', 'Dũng'));
    s.messageCreated('7', '3');
    expect(names(s)).toEqual(['Dũng']);
    vi.advanceTimersByTime(10_000);
    expect(names(s)).toEqual([]);
  });

  it('never shows me, keeps channels apart, falls back to the username', () => {
    const s = createTypingStore(() => ME);
    s.started(start(ME, 'An'));
    s.started(start('3', null, '8'));
    expect(names(s)).toEqual([]);
    expect(names(s, '8')).toEqual(['u3']);
  });

  it('reset forgets everyone (sign-out)', () => {
    const s = createTypingStore(() => ME);
    s.started(start('3', 'Chi'));
    s.reset();
    expect(s.state.getState()).toEqual({});
    vi.advanceTimersByTime(10_000); // a stale timer must not throw or resurrect
    expect(s.state.getState()).toEqual({});
  });
});

describe('typingLine (S-HOME-01 Nội dung chữ)', () => {
  it('one, two, then "many" from three', () => {
    expect(typingLine([])).toBeNull();
    expect(typingLine(['Chi'])).toEqual({
      key: 'chat.typing.one',
      values: { name: 'Chi' },
    });
    expect(typingLine(['Chi', 'Dũng'])).toEqual({
      key: 'chat.typing.two',
      values: { first: 'Chi', second: 'Dũng' },
    });
    expect(typingLine(['Chi', 'Dũng', 'Khánh'])?.key).toBe('chat.typing.many');
  });
});

describe('typing sender (DEC-33: at most once per 8 s)', () => {
  const setup = (online = true) => {
    const posts: string[] = [];
    let isOnline = online;
    const onDraft = createTypingSender({
      post: async (channelId) => void posts.push(channelId),
      online: () => isOnline,
      now: Date.now,
    });
    return { posts, onDraft, goOffline: () => (isOnline = false) };
  };

  it('calls on a changed, non-empty draft, then not again for 8 s', () => {
    const s = setup();
    s.onDraft('7', 'c', '');
    s.onDraft('7', 'câ', 'c');
    vi.advanceTimersByTime(7_999);
    s.onDraft('7', 'câu', 'câ');
    expect(s.posts).toEqual(['7']);
    vi.advanceTimersByTime(1);
    s.onDraft('7', 'câu ', 'câu');
    expect(s.posts).toEqual(['7', '7']);
  });

  it('each channel has its own 8 s', () => {
    const s = setup();
    s.onDraft('7', 'a', '');
    s.onDraft('8', 'b', '');
    expect(s.posts).toEqual(['7', '8']);
  });

  it('not for an emptied draft, an unchanged one, or while offline', () => {
    const s = setup();
    s.onDraft('7', '', 'abc'); // sent or cleared
    s.onDraft('7', 'x', 'x');
    s.goOffline();
    s.onDraft('8', 'x', '');
    expect(s.posts).toEqual([]);
  });

  it('a failed call is swallowed', async () => {
    const onDraft = createTypingSender({
      post: () => Promise.reject(new Error('offline')),
      online: () => true,
      now: Date.now,
    });
    expect(() => onDraft('7', 'a', '')).not.toThrow();
    await vi.runAllTimersAsync();
  });
});
