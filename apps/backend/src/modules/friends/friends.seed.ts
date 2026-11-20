import { inArray } from 'drizzle-orm';
import type { SeedContext } from '../../db/seed.js';
import { users } from '../users/users.schema.js';
import { pairKey } from './friends.repository.js';
import { FriendshipStatus, friendships, userBlocks } from './friends.schema.js';

type NewFriendship = typeof friendships.$inferInsert;

// 09 › Dữ liệu nhất quán: An's friends, Giang's request (19:48 with a message), An's request
// to Hà (yesterday, from a profile), An blocked Phong. Times are 18/10/2026 (+07).
const FRIENDS = [
  'binh.tran',
  'chi.le',
  'dung.pham',
  'tuan.hoang',
  'lan.vu',
  'minh.do',
];
const SINCE = new Date('2026-10-01T12:00:00Z');

export async function seedFriends({ db }: SeedContext) {
  const names = [...FRIENDS, 'an.nguyen', 'giang.vo', 'ha.nguyen', 'phong.vu'];
  const people = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(inArray(users.username, names));
  const id = new Map(people.map((p) => [p.username, p.id]));
  const an = id.get('an.nguyen');
  if (!an) return console.warn('friends: no an.nguyen, skipped');

  const pair = (other: bigint) => {
    const { low, high } = pairKey(an, other);
    return { userIdLow: low, userIdHigh: high };
  };
  const rows: NewFriendship[] = FRIENDS.flatMap((u) => {
    const other = id.get(u);
    return other
      ? [
          {
            ...pair(other),
            status: FriendshipStatus.accepted,
            requestedBy: an,
            createdAt: SINCE,
            respondedAt: SINCE,
          },
        ]
      : [];
  });
  const giang = id.get('giang.vo');
  if (giang)
    rows.push({
      ...pair(giang),
      status: FriendshipStatus.pending,
      requestedBy: giang,
      requestMessage: 'Mình là Giang lớp K22, xin vào nhóm ôn cùng nhé',
      createdAt: new Date('2026-10-18T12:48:00Z'),
    });
  const ha = id.get('ha.nguyen');
  if (ha)
    rows.push({
      ...pair(ha),
      status: FriendshipStatus.pending,
      requestedBy: an,
      createdAt: new Date('2026-10-17T13:30:00Z'),
    });
  if (rows.length)
    await db.insert(friendships).values(rows).onConflictDoNothing();

  const phong = id.get('phong.vu');
  if (phong)
    await db
      .insert(userBlocks)
      .values({ blockerId: an, blockedId: phong, createdAt: SINCE })
      .onConflictDoNothing();
}
