import {
  CreateRelationshipRequest,
  ErrorCode,
  FRIEND_REQUESTS_PER_DAY,
  LOOKUPS_PER_MINUTE,
  type DispatchEvent,
  type Relationship,
  type RelationshipType,
  type UserLookupResponse,
} from '@nezfocus/shared';
import type { FriendRepository } from '../../domain/friends/FriendRepository';
import { emitGatewayEvent } from '../../domain/gateway/gatewayStore';
import { ApiError } from '../api/client';

const fail = (status: number, code: number, retry_after?: number) =>
  new ApiError(status, { code, message: `fake ${code}`, retry_after });

type Person = Relationship['user'] & { bio: string | null };
const person = (
  id: string,
  username: string,
  name: string,
  bio: string | null = null,
): Person => ({ id, username, display_name: name, avatar: null, bio });

// Spec 09 › Dữ liệu nhất quán / Dữ liệu mẫu (ids as in the other fakes: Bình 2, Chi 3, Minh 6).
const PEOPLE = [
  person('2', 'binh.tran', 'Bình'),
  person('3', 'chi.le', 'Chi'),
  person('4', 'dung.pham', 'Dũng'),
  person('5', 'giang.vo', 'Giang'),
  person('6', 'minh.do', 'Minh'),
  person('7', 'ha.nguyen', 'Hà'),
  person('8', 'lan.vu', 'Lan'),
  person('9', 'mai.tran', 'Mai', 'Sinh viên K22 PTIT'),
  person('11', 'khanh.le', 'Khánh'),
  person('13', 'tuan.hoang', 'Tuấn'),
  person('16', 'phong.vu', 'Phong'),
];
// Khánh blocked An: his card looks normal, sending fails with 40303 (FRIEND-01 AC9).
const BLOCKED_ME = new Set(['11']);
const MUTUAL: Record<string, { id: string; name: string }[]> = {
  '9': [{ id: '100', name: 'Ôn thi Giải tích 2' }],
};

const userOf = (p: Person): Relationship['user'] => ({
  id: p.id,
  username: p.username,
  display_name: p.display_name,
  avatar: p.avatar,
});
const rel = (
  id: string,
  type: RelationshipType,
  created_at: string,
  request_message: string | null = null,
): Relationship => ({
  user: userOf(PEOPLE.find((p) => p.id === id)!),
  type,
  request_message,
  created_at,
});

const initial = (): Relationship[] => {
  const since = '2026-10-01T12:00:00.000Z';
  return [
    ...['2', '3', '4', '13', '8', '6'].map((id) => rel(id, 'friend', since)),
    rel(
      '5',
      'incoming',
      // "19:48" today (+07), like the frame
      new Date(new Date().setHours(19, 48, 0, 0)).toISOString(),
      'Mình là Giang lớp K22, xin vào nhóm ôn cùng nhé',
    ),
    rel('7', 'outgoing', new Date(Date.now() - 86_400_000).toISOString()),
    rel('16', 'blocked', since),
  ];
};

let list = initial();
let lookups: number[] = [];
let sentToday = 0;
const replayed = new Map<string, Relationship>();

// What the backend would push over the Gateway after each change.
const emit = (event: Omit<DispatchEvent, 's'>) =>
  setTimeout(() => emitGatewayEvent({ ...event, s: 0 } as DispatchEvent), 0);
const set = (r: Relationship) => {
  list = [...list.filter((x) => x.user.id !== r.user.id), r];
  emit({ t: 'RELATIONSHIP_ADD', d: r } as never);
  return r;
};
const find = (id: string) => list.find((r) => r.user.id === id);
const later = () => new Promise((r) => setTimeout(r, 400));

// EXPO_PUBLIC_FAKE=friends (WORKFLOW 4.2).
export const fakeFriendRepository: FriendRepository & {
  snapshot(): Relationship[];
  reset(): void;
} = {
  snapshot: () => list,
  reset() {
    list = initial();
    lookups = [];
    sentToday = 0;
    replayed.clear();
  },
  async list() {
    return list;
  },
  async lookup(username): Promise<UserLookupResponse> {
    await later();
    const now = Date.now();
    lookups = [...lookups.filter((t) => now - t < 60_000), now];
    if (lookups.length > LOOKUPS_PER_MINUTE)
      throw fail(429, ErrorCode.RateLimited, 42);
    const p = PEOPLE.find((x) => x.username === username);
    if (!p) throw fail(404, ErrorCode.NotFound);
    return {
      user: { ...userOf(p), bio: p.bio },
      relationship: find(p.id)?.type ?? 'none',
      mutual_servers: MUTUAL[p.id] ?? [],
    };
  },
  async send(input, key) {
    const seen = replayed.get(key);
    if (seen) return seen;
    await later();
    const body = CreateRelationshipRequest.parse(input);
    const p = PEOPLE.find((x) =>
      body.username ? x.username === body.username : x.id === body.user_id,
    );
    if (!p) throw fail(404, ErrorCode.NotFound);
    const current = find(p.id);
    if (BLOCKED_ME.has(p.id) || current?.type === 'blocked')
      throw fail(403, ErrorCode.CannotMessageUser);
    if (current?.type === 'friend') throw fail(409, ErrorCode.AlreadyFriends);
    if (current?.type === 'outgoing')
      throw fail(409, ErrorCode.FriendRequestAlreadyPending);
    if (current?.type === 'incoming') return this.accept(p.id);
    if (sentToday >= FRIEND_REQUESTS_PER_DAY)
      throw fail(429, ErrorCode.RateLimited, 3600);
    sentToday++;
    const message = 'message' in body ? body.message : null;
    const r = set(
      rel(p.id, 'outgoing', new Date().toISOString(), message ?? null),
    );
    replayed.set(key, r);
    return r;
  },
  async accept(userId) {
    await later();
    if (find(userId)?.type !== 'incoming') throw fail(404, ErrorCode.NotFound);
    return set(rel(userId, 'friend', find(userId)!.created_at));
  },
  async block(userId) {
    await later();
    return set(rel(userId, 'blocked', new Date().toISOString()));
  },
  async remove(userId) {
    await later();
    const current = find(userId);
    if (!current) throw fail(404, ErrorCode.NotFound);
    list = list.filter((r) => r.user.id !== userId);
    emit({
      t: 'RELATIONSHIP_REMOVE',
      d: { user_id: userId, type: current.type },
    } as never);
  },
};
