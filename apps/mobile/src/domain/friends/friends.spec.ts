import { describe, expect, it } from 'vitest';
import type { PresenceEvent, Relationship } from '@nezfocus/shared';
import {
  blockedRows,
  emptyFriends,
  friendSections,
  incomingCount,
  pendingRows,
  reduceRelationships,
  requestTime,
  studyingFriends,
  withBusy,
  type FriendsState,
} from './friends';

const rel = (
  id: string,
  name: string,
  username: string,
  type: Relationship['type'],
  o: Partial<Relationship> = {},
): Relationship => ({
  user: { id, username, display_name: name, avatar: null },
  type,
  request_message: null,
  created_at: '2026-10-01T12:00:00Z',
  ...o,
});

// Spec 09 › Dữ liệu nhất quán: An's list at 20:12, 18/10/2026.
const SAMPLE = [
  rel('2', 'Bình', 'binh.tran', 'friend'),
  rel('3', 'Chi', 'chi.le', 'friend'),
  rel('4', 'Dũng', 'dung.pham', 'friend'),
  rel('13', 'Tuấn', 'tuan.hoang', 'friend'),
  rel('8', 'Lan', 'lan.vu', 'friend'),
  rel('10', 'Minh', 'minh.do', 'friend'),
  rel('5', 'Giang', 'giang.vo', 'incoming', {
    request_message: 'Mình là Giang lớp K22, xin vào nhóm ôn cùng nhé',
    created_at: '2026-10-18T12:48:00Z',
  }),
  rel('6', 'Hà', 'ha.nguyen', 'outgoing', {
    created_at: '2026-10-17T13:30:00Z',
  }),
  rel('16', 'Phong', 'phong.vu', 'blocked'),
];
const PRESENCE: Record<string, PresenceEvent['status']> = {
  '2': 'online',
  '3': 'online',
  '4': 'online',
  '13': 'idle',
};
const presenceOf = (id: string): PresenceEvent => ({
  user_id: id,
  status: PRESENCE[id] ?? 'offline',
  activity: null,
});

const ready = (relationships: Relationship[]): FriendsState =>
  reduceRelationships(emptyFriends, {
    t: 'READY',
    d: { relationships },
  } as never);

const names = (rows: { user: { display_name: string | null } }[]) =>
  rows.map((r) => r.user.display_name);

describe('friends (REQ-FRIEND-04)', () => {
  it('online: online → idle → dnd, then by name; all adds offline by name', () => {
    const s = ready([...SAMPLE, rel('11', 'Ánh', 'anh.x', 'friend')]);
    PRESENCE['11'] = 'dnd';
    const online = friendSections(s, presenceOf, 'online', '');
    expect(names(online.online)).toEqual([
      'Bình',
      'Chi',
      'Dũng',
      'Tuấn',
      'Ánh',
    ]);
    expect(online.offline).toEqual([]);
    const all = friendSections(s, presenceOf, 'all', '');
    expect(names(all.offline)).toEqual(['Lan', 'Minh']);
    delete PRESENCE['11'];
  });

  it('names sort in Vietnamese order, not by code point', () => {
    const s = ready([
      rel('20', 'Đức', 'duc', 'friend'),
      rel('21', 'Dung', 'dung', 'friend'),
      rel('22', 'Ê', 'e', 'friend'),
    ]);
    expect(names(friendSections(s, presenceOf, 'all', '').offline)).toEqual([
      'Dung',
      'Đức',
      'Ê',
    ]);
  });

  it('search: no marks, name or username, within the tab', () => {
    const s = ready(SAMPLE);
    expect(names(friendSections(s, presenceOf, 'all', 'bi').online)).toEqual([
      'Bình',
    ]);
    expect(names(friendSections(s, presenceOf, 'all', 'dung').online)).toEqual([
      'Dũng',
    ]);
    expect(
      names(friendSections(s, presenceOf, 'online', 'lan').online),
    ).toEqual([]);
    expect(names(pendingRows(s, 'incoming', 'k22'))).toEqual([]); // message is not searched
    expect(names(pendingRows(s, 'incoming', 'giang'))).toEqual(['Giang']);
  });

  it('pending: newest first in each chip; incoming count; blocked list', () => {
    const s = reduceRelationships(ready(SAMPLE), {
      t: 'RELATIONSHIP_ADD',
      d: rel('9', 'Mai', 'mai.tran', 'outgoing', {
        created_at: '2026-10-18T13:00:00Z',
      }),
    } as never);
    expect(names(pendingRows(s, 'outgoing', ''))).toEqual(['Mai', 'Hà']);
    expect(incomingCount(s)).toBe(1);
    expect(names(blockedRows(s, ''))).toEqual(['Phong']);
  });

  it('RELATIONSHIP_ADD replaces the entry of that user; REMOVE only drops the type it names', () => {
    let s = ready(SAMPLE);
    s = reduceRelationships(s, {
      t: 'RELATIONSHIP_ADD',
      d: rel('5', 'Giang', 'giang.vo', 'friend'),
    } as never);
    expect(s.byUser['5']?.type).toBe('friend');
    expect(incomingCount(s)).toBe(0);
    // a stale remove of the old type leaves the new one alone
    s = reduceRelationships(s, {
      t: 'RELATIONSHIP_REMOVE',
      d: { user_id: '5', type: 'incoming' },
    } as never);
    expect(s.byUser['5']?.type).toBe('friend');
    s = reduceRelationships(s, {
      t: 'RELATIONSHIP_REMOVE',
      d: { user_id: '5', type: 'friend' },
    } as never);
    expect(s.byUser['5']).toBeUndefined();
  });

  it('request time: today HH:mm, yesterday, dd/MM this year, dd/MM/yyyy before', () => {
    const now = Date.parse('2026-10-18T13:12:00Z');
    const tz = 'Asia/Ho_Chi_Minh';
    expect(requestTime('2026-10-18T12:48:00Z', now, tz)).toEqual({
      kind: 'time',
      text: '19:48',
    });
    expect(requestTime('2026-10-17T13:30:00Z', now, tz)).toEqual({
      kind: 'yesterday',
    });
    expect(requestTime('2026-09-02T03:00:00Z', now, tz)).toEqual({
      kind: 'time',
      text: '02/09',
    });
    expect(requestTime('2025-09-02T03:00:00Z', now, tz)).toEqual({
      kind: 'time',
      text: '02/09/2025',
    });
  });

  it('studying: rooms with most friends first, then hidden rooms, then Solo; voice only is out', () => {
    const s = ready(SAMPLE);
    const room = (id: string) => ({
      kind: 'group_study' as const,
      room: {
        channel_id: id,
        server_id: '10',
        channel_name: id,
        phase: 'focus' as const,
        state: 'running' as const,
        phase_ends_at: null,
      },
    });
    const act: Record<string, PresenceEvent['activity']> = {
      '2': room('A'),
      '3': room('A'),
      '13': room('B'),
      '6': null,
      '10': {
        kind: 'solo',
        phase: 'focus',
        state: 'running',
        phase_ends_at: null,
      },
      '8': { kind: 'group_study', room: null },
      '4': { kind: 'voice', room: null },
    };
    const of = (id: string): PresenceEvent => ({
      user_id: id,
      status: 'online',
      activity: act[id] ?? null,
    });
    expect(studyingFriends(s, of).map((x) => x.r.user.display_name)).toEqual([
      'Bình',
      'Chi',
      'Tuấn',
      'Lan',
      'Minh',
    ]);
  });
});

describe('per-row busy (S-DM-04: one request never blocks another row)', () => {
  it('B finishing leaves A busy, and A is not re-added', () => {
    let busy: ReadonlySet<string> = new Set();
    busy = withBusy(busy, 'a', true);
    busy = withBusy(busy, 'b', true);
    busy = withBusy(busy, 'b', false);
    expect([...busy]).toEqual(['a']);
    expect(busy.has('b')).toBe(false);
    expect(withBusy(busy, 'a', true)).toBe(busy);
  });
});
