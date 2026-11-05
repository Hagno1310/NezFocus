import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { emailCodes, type EmailCodeRow } from './auth.schema.js';

export type EmailCodePurpose = 'sign_in' | 'reset_password';

@Injectable()
export class EmailCodeRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  private match(email: string, purpose: EmailCodePurpose) {
    return and(eq(emailCodes.email, email), eq(emailCodes.purpose, purpose));
  }

  // A new code replaces the old one for the same email and purpose.
  async upsert(row: Omit<EmailCodeRow, 'attempts' | 'createdAt'>) {
    const fresh = { ...row, attempts: 0, createdAt: new Date() };
    await this.db
      .insert(emailCodes)
      .values(fresh)
      .onConflictDoUpdate({
        target: [emailCodes.email, emailCodes.purpose],
        set: fresh,
      });
  }

  async find(email: string, purpose: EmailCodePurpose) {
    const [row] = await this.db
      .select()
      .from(emailCodes)
      .where(this.match(email, purpose));
    return row;
  }

  // Takes one guess before the code is compared, in one statement, so parallel requests
  // cannot get more than `maxAttempts` comparisons. Undefined = no live code left.
  async reserveAttempt(
    email: string,
    purpose: EmailCodePurpose,
    maxAttempts: number,
    now: Date,
  ) {
    const [row] = await this.db
      .update(emailCodes)
      .set({ attempts: sql`${emailCodes.attempts} + 1` })
      .where(
        and(
          this.match(email, purpose),
          lt(emailCodes.attempts, maxAttempts),
          gt(emailCodes.expiresAt, now),
        ),
      )
      .returning({
        attempts: emailCodes.attempts,
        codeHash: emailCodes.codeHash,
      });
    return row;
  }

  async delete(email: string, purpose: EmailCodePurpose) {
    await this.db.delete(emailCodes).where(this.match(email, purpose));
  }
}
