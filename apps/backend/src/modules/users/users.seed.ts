import { TERMS_VERSION } from '@nezfocus/shared';
import { and, inArray, isNotNull } from 'drizzle-orm';
import type { SeedContext } from '../../db/seed.js';
import { PasswordHasher } from '../auth/password-hasher.js';
import { users, userSettings } from './users.schema.js';

// Same password as the app's FakeAuthRepository (FAKE_PASSWORD), so Fake and seed sign in alike.
export const DEV_PASSWORD = 'NezFocus@2026';

// docs/design/screens/README.md › Bộ dữ liệu mẫu: the only usernames frames use.
export const SAMPLE_USERS = [
  ['an.nguyen', 'An'],
  ['binh.tran', 'Bình'],
  ['chi.le', 'Chi'],
  ['dung.pham', 'Dũng'],
  ['giang.vo', 'Giang'],
  ['ha.nguyen', 'Hà'],
  ['khanh.le', 'Khánh'],
  ['lan.vu', 'Lan'],
  ['mai.tran', 'Mai'],
  ['minh.do', 'Minh'],
  ['nam.ho', 'Nam'],
  ['quan.ng', 'Quân'],
  ['tuan.hoang', 'Tuấn'],
  ['phuc.le', 'Phúc'],
  ['vu.dang', 'Vũ'],
  ['phong.vu', 'Phong'],
].map(([username, displayName]) => ({
  username,
  displayName,
  email: `${username}@gmail.com`, // an.nguyen@gmail.com is spec 01's address
}));

// Completed accounts (P0-2.2); a taken email or username is skipped so reruns never touch people's own accounts.
export async function seedUsers({ db, ids, now }: SeedContext) {
  const passwordHash = await new PasswordHasher().hash(DEV_PASSWORD);
  await db.transaction(async (tx) => {
    const created = await tx
      .insert(users)
      .values(
        SAMPLE_USERS.map((u) => ({
          id: ids.next(),
          ...u,
          passwordHash,
          emailVerifiedAt: now,
          termsVersion: TERMS_VERSION,
          termsAcceptedAt: now,
          accountCompletedAt: now,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: users.id });
    if (created.length)
      await tx
        .insert(userSettings)
        .values(created.map(({ id }) => ({ userId: id })));
    console.log(
      `users: ${created.length} created, ${SAMPLE_USERS.length - created.length} already there`,
    );
  });

  // A skipped sample may belong to someone's half-done sign-up: say so instead of failing at sign-in.
  const ready = await db
    .select({ username: users.username })
    .from(users)
    .where(
      and(
        inArray(
          users.email,
          SAMPLE_USERS.map((u) => u.email),
        ),
        isNotNull(users.accountCompletedAt),
      ),
    );
  const readyNames = new Set(ready.map((r) => r.username));
  const blocked = SAMPLE_USERS.filter((u) => !readyNames.has(u.username));
  if (blocked.length)
    console.warn(
      `users: cannot sign in as ${blocked.map((u) => u.username).join(', ')}: ` +
        'the email or username belongs to another account; delete it to reseed',
    );
}
