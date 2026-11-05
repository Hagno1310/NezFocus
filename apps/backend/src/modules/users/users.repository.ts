import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { isUniqueViolation } from '../../common/db-errors.js';
import { DB, type Db } from '../../db/db.module.js';
import { users, userSettings, type UserRow } from './users.schema.js';

export class UsernameTakenError extends Error {}

export type CompletedAccount = {
  username: string;
  displayName: string;
  passwordHash: string;
  termsVersion: string;
  timezone: string;
  locale: string;
  now: Date;
};

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findById(id: bigint): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id));
    return row;
  }

  // `email` is already lowercase (shared Email schema).
  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`);
    return row;
  }

  // AUTH-13 AC1: the account is born active with a verified email, not yet completed.
  // Two verifies racing for one email: the loser reads the winner's row.
  async createVerified(input: {
    id: bigint;
    email: string;
    now: Date;
  }): Promise<UserRow> {
    try {
      return await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(users)
          .values({
            id: input.id,
            email: input.email,
            emailVerifiedAt: input.now,
          })
          .returning();
        await tx.insert(userSettings).values({ userId: input.id });
        return row;
      });
    } catch (err) {
      if (!isUniqueViolation(err, 'uq_users_email')) throw err;
      const existing = await this.findByEmail(input.email);
      if (!existing) throw err;
      return existing;
    }
  }

  async usernameExists(username: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username));
    return row !== undefined;
  }

  // Returns undefined when the account was already completed.
  async complete(
    id: bigint,
    input: CompletedAccount,
  ): Promise<UserRow | undefined> {
    try {
      return await this.db.transaction(async (tx) => {
        const [row] = await tx
          .update(users)
          .set({
            username: input.username,
            displayName: input.displayName,
            passwordHash: input.passwordHash,
            termsVersion: input.termsVersion,
            termsAcceptedAt: input.now,
            accountCompletedAt: input.now,
            updatedAt: input.now,
          })
          .where(and(eq(users.id, id), isNull(users.accountCompletedAt)))
          .returning();
        if (!row) return undefined;
        await tx
          .update(userSettings)
          .set({
            timezone: input.timezone,
            locale: input.locale,
            updatedAt: input.now,
          })
          .where(eq(userSettings.userId, id));
        return row;
      });
    } catch (err) {
      if (isUniqueViolation(err, 'users_username_unique'))
        throw new UsernameTakenError();
      throw err;
    }
  }
}
