import type { MessageResponse } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { createTestDb } from '../db/testDb';
import type { OutboxEntry } from '../../domain/messages/outbox';
import { createLocalMessages } from './localMessages';

const message = (id: string, channelId = '7'): MessageResponse => ({
  id,
  channel_id: channelId,
  author: {
    id: '1',
    username: 'binh.tran',
    display_name: 'Bình',
    avatar: null,
  },
  type: 'default',
  content: `Tin ${id}`,
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
  created_at: '2026-10-18T13:02:00.000Z',
});

const entry = (
  nonce: string,
  over: Partial<OutboxEntry> = {},
): OutboxEntry => ({
  nonce,
  channelId: '7',
  serverId: '9',
  content: 'Chào',
  replyToId: null,
  status: 'pending',
  attempts: 0,
  nextAttemptAt: null,
  lastError: null,
  createdAt: 1,
  queuedAt: 1,
  ...over,
});

const local = () => {
  const db = createTestDb();
  return createLocalMessages(async () => db);
};

describe('createLocalMessages (SRS 8.7)', () => {
  it('orders by id as numbers, though stored as text', async () => {
    const db = local();
    await db.saveMessages([message('100'), message('99'), message('1000')]);
    expect((await db.messages('7')).map((m) => m.id)).toEqual([
      '99',
      '100',
      '1000',
    ]);
  });

  it('replaces a message saved twice (MSG-09 AC3: never two copies)', async () => {
    const db = local();
    await db.saveMessages([message('5')]);
    await db.saveMessages([{ ...message('5'), content: 'mới' }]);
    expect(await db.messages('7')).toEqual([
      { ...message('5'), content: 'mới' },
    ]);
  });

  it('keeps the newest 50 of a closed channel and at most 200 channels (7.3.2)', async () => {
    const db = local();
    await db.saveMessages(
      Array.from({ length: 60 }, (_, i) => message(String(i + 1))),
    );
    await db.touchChannel('7', '9', 1);
    await db.touchChannel('8', '9', 2);
    await db.saveMessages([message('500', '8')]);
    await db.prune(50, 1);
    expect(await db.isCached('7')).toBe(false);
    expect(await db.messages('7')).toEqual([]);
    expect(await db.messages('8')).toHaveLength(1);

    await db.saveMessages(
      Array.from({ length: 60 }, (_, i) => message(String(i + 1), '8')),
    );
    await db.prune(50, 200);
    const kept = await db.messages('8');
    expect(kept).toHaveLength(50);
    expect(kept.at(-1)!.id).toBe('500');
  });

  it('does not trim the channel on screen', async () => {
    const db = local();
    await db.touchChannel('7', '9', 1);
    await db.saveMessages(
      Array.from({ length: 60 }, (_, i) => message(String(i + 1))),
    );
    await db.prune(50, 200, '7');
    expect(await db.messages('7')).toHaveLength(60);
  });

  it('keeps the outbox in creation order and patches entries', async () => {
    const db = local();
    await db.addOutbox(entry('b', { createdAt: 2 }));
    await db.addOutbox(entry('a', { createdAt: 1 }));
    await db.updateOutbox('a', { status: 'retrying', attempts: 1 });
    expect((await db.outbox()).map((e) => [e.nonce, e.status])).toEqual([
      ['a', 'retrying'],
      ['b', 'pending'],
    ]);
    await db.removeOutbox('a');
    expect((await db.outbox()).map((e) => e.nonce)).toEqual(['b']);
  });

  it('dropServer removes that server’s outbox and cached channels only', async () => {
    const db = local();
    await db.touchChannel('7', '9', 1);
    await db.touchChannel('8', '10', 1);
    await db.saveMessages([message('1'), message('2', '8')]);
    await db.addOutbox(entry('a'));
    await db.addOutbox(entry('b', { channelId: '8', serverId: '10' }));
    await db.dropServer('9');
    expect(await db.messages('7')).toEqual([]);
    expect(await db.messages('8')).toHaveLength(1);
    expect((await db.outbox()).map((e) => e.nonce)).toEqual(['b']);
  });

  it('S-HOME-10: the channel of a server opened most recently', async () => {
    const db = createTestDb();
    const local = createLocalMessages(async () => db);
    expect(await local.lastOpened('1')).toBeNull();
    await local.touchChannel('7', '1', 100);
    await local.touchChannel('8', '1', 300);
    await local.touchChannel('9', '2', 400);
    expect(await local.lastOpened('1')).toBe('8');
  });
});
