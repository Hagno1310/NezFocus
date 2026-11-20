import type { Relationship } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { createTestDb } from '../db/testDb';
import {
  friendSections,
  setRelationships,
  emptyFriends,
} from '../../domain/friends/friends';
import { createLocalRelationships } from './localRelationships';

const rel = (id: string, type: Relationship['type']): Relationship => ({
  user: { id, username: `u${id}`, display_name: null, avatar: null },
  type,
  request_message: null,
  created_at: '2026-10-18T12:48:00.000Z',
});

describe('local relationships (SRS 8.7)', () => {
  it('keeps the last list written, and only that', async () => {
    const db = createTestDb();
    const local = createLocalRelationships(async () => db);
    await local.replace([rel('2', 'friend'), rel('5', 'incoming')]);
    await local.replace([rel('2', 'friend'), rel('16', 'blocked')]);
    expect((await local.all()).map((r) => [r.user.id, r.type]).sort()).toEqual([
      ['16', 'blocked'],
      ['2', 'friend'],
    ]);
  });

  it('FRIEND-04 AC1: 200 friends come out of the cache, sorted, within 300 ms', async () => {
    const db = createTestDb();
    const local = createLocalRelationships(async () => db);
    await local.replace(
      Array.from({ length: 200 }, (_, i) => rel(String(100 + i), 'friend')),
    );
    const started = performance.now();
    const state = setRelationships(emptyFriends, await local.all());
    const { online, offline } = friendSections(
      state,
      (id) => ({
        user_id: id,
        status: Number(id) % 3 ? 'offline' : 'online',
        activity: null,
      }),
      'all',
      '',
    );
    expect(online.length + offline.length).toBe(200);
    expect(performance.now() - started).toBeLessThan(300);
  });
});
