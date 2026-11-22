import type { MessageCreateEvent, ReadState } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  firstUnread,
  isUnread,
  reduceUnread,
  totals,
  type UnreadState,
} from './unread';

const AN = '1';
const read = (o: Partial<ReadState> & { channel_id: string }): ReadState => ({
  server_id: 'G1',
  last_read_message_id: null,
  last_message_id: null,
  mention_count: 0,
  ...o,
});
const created = (
  channel: string,
  id: string,
  author: string,
  o: Partial<MessageCreateEvent> = {},
) =>
  ({
    id,
    channel_id: channel,
    server_id: 'G1',
    author: { id: author, username: null, display_name: null, avatar: null },
    type: 'default',
    content: 'x',
    nonce: null,
    mention_user_ids: [],
    mention_role_ids: [],
    mention_everyone: false,
    system_data: null,
    reply_to_id: null,
    edited_at: null,
    pinned_at: null,
    created_at: '2026-10-18T13:00:00Z',
    ...o,
  }) as MessageCreateEvent;
const ctx = {
  myId: AN,
  concerns: (m: MessageCreateEvent) => m.mention_user_ids.includes(AN),
};

const ready = (states: ReadState[]): UnreadState =>
  reduceUnread({}, { t: 'READY', read_states: states }, ctx);

describe('REQ-NOTIF-01 unread state', () => {
  it('READY fills it; unread = a newer message than the last read', () => {
    const s = ready([
      read({
        channel_id: 'a',
        last_read_message_id: '5',
        last_message_id: '9',
      }),
      read({
        channel_id: 'b',
        last_read_message_id: '9',
        last_message_id: '9',
      }),
      read({ channel_id: 'c', last_message_id: null }),
      read({ channel_id: 'd', last_message_id: '3' }), // never read
    ]);
    expect(['a', 'b', 'c', 'd'].map((id) => isUnread(s[id]))).toEqual([
      true,
      false,
      false,
      true,
    ]);
  });

  it('AC2: a message that concerns me adds 1 mention; mine counts as read', () => {
    let s = ready([
      read({
        channel_id: 'a',
        last_read_message_id: '5',
        last_message_id: '5',
      }),
    ]);
    s = reduceUnread(
      s,
      {
        t: 'MESSAGE_CREATE',
        d: created('a', '10', '2', { mention_user_ids: [AN] }),
      },
      ctx,
    );
    expect(s.a).toMatchObject({ lastMessage: '10', mentions: 1 });
    s = reduceUnread(
      s,
      { t: 'MESSAGE_CREATE', d: created('a', '11', AN) },
      ctx,
    );
    expect(s.a).toMatchObject({ lastRead: '11', lastMessage: '11' });
    expect(isUnread(s.a)).toBe(false);
  });

  it('a channel first seen by MESSAGE_CREATE starts unread', () => {
    const s = reduceUnread(
      {},
      { t: 'MESSAGE_CREATE', d: created('n', '7', '2') },
      ctx,
    );
    expect(s.n).toEqual({
      serverId: 'G1',
      lastRead: null,
      lastMessage: '7',
      mentions: 0,
    });
  });

  it('AC1: MESSAGE_ACK from my other phone sets last read (never back) and mentions', () => {
    let s = ready([
      read({
        channel_id: 'a',
        last_read_message_id: '5',
        last_message_id: '9',
        mention_count: 2,
      }),
    ]);
    s = reduceUnread(
      s,
      {
        t: 'MESSAGE_ACK',
        d: { channel_id: 'a', message_id: '9', mention_count: 0 },
      },
      ctx,
    );
    expect(s.a).toMatchObject({ lastRead: '9', mentions: 0 });
    s = reduceUnread(
      s,
      {
        t: 'MESSAGE_ACK',
        d: { channel_id: 'a', message_id: '6', mention_count: 0 },
      },
      ctx,
    );
    expect(s.a!.lastRead).toBe('9');
  });

  it('`unread-mention` totals: per server, Home = mentions of every server + unread DMs', () => {
    const s = ready([
      read({
        channel_id: 'tai-lieu',
        server_id: 'G1',
        last_message_id: '9',
        last_read_message_id: '5',
      }),
      read({
        channel_id: 'viec-nhom',
        server_id: 'G1',
        last_message_id: '9',
        last_read_message_id: '5',
        mention_count: 1,
      }),
      read({
        channel_id: 'x',
        server_id: 'G2',
        last_message_id: '9',
        last_read_message_id: '5',
        mention_count: 2,
      }),
      read({
        channel_id: 'y',
        server_id: 'G3',
        last_message_id: '9',
        last_read_message_id: '5',
      }),
      read({
        channel_id: 'dm',
        server_id: null,
        last_message_id: '9',
        last_read_message_id: '5',
      }),
    ]);
    const t = totals(s);
    expect(t.servers).toEqual({
      G1: { mentions: 1, unread: true },
      G2: { mentions: 2, unread: true },
      G3: { mentions: 0, unread: true },
    });
    expect(t.dms).toBe(1);
    expect(t.home).toBe(4);
  });
});

describe('firstUnread', () => {
  it('the first message after the last read that is not mine', () => {
    const items = ['4', '5', '6', '7'].map((id) => ({
      id,
      authorId: id === '6' ? AN : '2',
    }));
    expect(firstUnread(items, '5', AN)).toBe('7');
    expect(firstUnread(items, '4', AN)).toBe('5');
    expect(firstUnread(items, '7', AN)).toBeNull();
    expect(firstUnread(items, null, AN)).toBe('4');
  });
});
