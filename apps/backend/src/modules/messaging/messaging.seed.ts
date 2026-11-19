import { and, eq, inArray } from 'drizzle-orm';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import type { SeedContext } from '../../db/seed.js';
import { SAMPLE_SERVERS } from '../servers/servers.seed.js';
import { channels, servers } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';
import { messages } from './messages.schema.js';

// 02 › "Tin mẫu của #hoi-dap" on 18/10/2026 (+07), text only: the image, reply, reactions
// and the mention chip come with P3-A2, P3-A1 and P2-A4.
const SAMPLE_MESSAGES: [time: string, username: string, content: string][] = [
  [
    '20:02',
    'binh.tran',
    'Mọi người ơi, câu 3 đề giữa kỳ năm ngoái giải thế nào vậy?',
  ],
  ['20:04', 'chi.le', 'Đổi sang tọa độ cực rồi tính tích phân kép là ra nhé'],
  ['20:05', 'khanh.le', 'Bán đề thi giữa kỳ có đáp án 50k, ai cần inbox mình'],
  ['20:06', 'dung.pham', 'Cảm ơn Chi, mình ra 8π/3 rồi'],
  ['20:10', 'binh.tran', '@An tối nay 20:30 vào Phòng học im lặng ôn tiếp nhé'],
  ['20:11', 'an.nguyen', 'Ok, mình vào sớm giữ chỗ'],
];

export async function seedMessages({ db }: SeedContext) {
  const people = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(
      inArray(users.username, [...new Set(SAMPLE_MESSAGES.map((m) => m[1]))]),
    );
  const idOf = new Map(people.map((p) => [p.username, p.id]));
  const an = idOf.get('an.nguyen');
  if (!an) return console.warn('messages: no an.nguyen, skipped');
  const [hoiDap] = await db
    .select({ id: channels.id })
    .from(channels)
    .innerJoin(servers, eq(servers.id, channels.serverId))
    .where(
      and(
        eq(servers.ownerId, an),
        eq(servers.name, SAMPLE_SERVERS[0]!.name),
        eq(channels.name, 'hoi-dap'),
      ),
    );
  if (!hoiDap) return console.warn('messages: no #hoi-dap, skipped');
  const [any] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.channelId, hoiDap.id))
    .limit(1);
  if (any) return console.log('messages: #hoi-dap already has messages');

  // The id carries the sample time, so history and grouping match the frames.
  const rows = SAMPLE_MESSAGES.flatMap(([time, username, content]) => {
    const authorId = idOf.get(username);
    if (!authorId) return [];
    const at = new Date(`2026-10-18T${time}:00+07:00`);
    return [
      {
        id: new SnowflakeGenerator(0, () => at.getTime()).next(),
        channelId: hoiDap.id,
        authorId,
        content,
        createdAt: at,
      },
    ];
  });
  await db.insert(messages).values(rows);
  await db
    .update(channels)
    .set({ lastMessageId: rows.at(-1)!.id })
    .where(eq(channels.id, hoiDap.id));
  console.log(`messages: ${rows.length} in #hoi-dap`);
}
