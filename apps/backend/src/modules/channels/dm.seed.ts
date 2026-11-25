import { and, eq, inArray } from 'drizzle-orm';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import type { SeedContext } from '../../db/seed.js';
import { pairKey } from '../friends/friends.repository.js';
import { messages, readStates } from '../messaging/messages.schema.js';
import { ChannelTypeCode, channels } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';
import { channelRecipients, dmPairs } from './dm.schema.js';

// 09 › Dữ liệu mẫu, danh sách DM của An (+07). Text only: the call messages come with
// P3-B6.3 (#157), so Tuấn's last line is a text one; the Group DM is v1.x.
const SAMPLE_DMS: [
  other: string,
  lines: [at: string, from: 'an' | 'them', content: string][],
  readByAn: boolean,
][] = [
  [
    'binh.tran',
    [
      [
        '2026-10-17T16:46',
        'them',
        'Gọi không được, chắc bạn đang học. Mai nộp bài chưa?',
      ],
      ['2026-10-17T16:52', 'an', 'Mình vừa ra khỏi phòng, để mình gọi lại'],
      [
        '2026-10-18T19:40',
        'them',
        'Tối nay 20:30 ôn tiếp nhé, mình giữ chỗ trong phòng',
      ],
      ['2026-10-18T19:41', 'an', 'Ok 👍'],
    ],
    true,
  ],
  ['chi.le', [['2026-10-18T20:08', 'them', 'Mai đi thư viện không?']], false],
  ['tuan.hoang', [['2026-10-17T21:30', 'them', 'Cảm ơn bạn đã gọi nhé']], true],
  ['minh.do', [['2026-10-15T09:12', 'an', 'Cảm ơn nha']], true],
];

const idAt = (at: string) =>
  new SnowflakeGenerator(0, () => new Date(`${at}:00+07:00`).getTime()).next();

export async function seedDms({ db, ids }: SeedContext) {
  const names = ['an.nguyen', ...SAMPLE_DMS.map((d) => d[0])];
  const people = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(inArray(users.username, names));
  const idOf = new Map(people.map((p) => [p.username, p.id]));
  const an = idOf.get('an.nguyen');
  if (!an) return console.warn('dms: no an.nguyen, skipped');

  let made = 0;
  for (const [username, lines, readByAn] of SAMPLE_DMS) {
    const other = idOf.get(username);
    if (!other) continue;
    const { low, high } = pairKey(an, other);
    const channelId = ids.next();
    const rows = lines.map(([at, from, content]) => ({
      id: idAt(at),
      channelId,
      authorId: from === 'an' ? an : other,
      content,
      createdAt: new Date(`${at}:00+07:00`),
    }));
    const last = rows.at(-1)!;
    const [taken] = await db
      .select()
      .from(dmPairs)
      .where(and(eq(dmPairs.userIdLow, low), eq(dmPairs.userIdHigh, high)));
    if (taken) continue; // reruns keep the DM people already have
    await db.transaction(async (tx) => {
      await tx.insert(channels).values({
        id: channelId,
        type: ChannelTypeCode.dm,
        lastMessageId: last.id,
      });
      await tx.insert(channelRecipients).values([
        { channelId, userId: an },
        { channelId, userId: other },
      ]);
      await tx
        .insert(dmPairs)
        .values({ userIdLow: low, userIdHigh: high, channelId });
      await tx.insert(messages).values(rows);
      // S-DM-01: only Chi's message is unread for An; each sender has read their own.
      const lastOf = (who: bigint) =>
        rows.filter((r) => r.authorId === who).at(-1)?.id ?? 0n;
      await tx.insert(readStates).values([
        {
          userId: an,
          channelId,
          lastReadMessageId: readByAn ? last.id : lastOf(an),
        },
        { userId: other, channelId, lastReadMessageId: last.id },
      ]);
    });
    made++;
  }
  console.log(`dms: ${made} DM(s) for an.nguyen`);
}
