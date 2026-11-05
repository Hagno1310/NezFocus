import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
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

  // Atomic, so parallel wrong guesses cannot share one attempt.
  async addAttempt(email: string, purpose: EmailCodePurpose) {
    const [row] = await this.db
      .update(emailCodes)
      .set({ attempts: sql`${emailCodes.attempts} + 1` })
      .where(this.match(email, purpose))
      .returning({ attempts: emailCodes.attempts });
    return row?.attempts ?? Number.POSITIVE_INFINITY;
  }

  async delete(email: string, purpose: EmailCodePurpose) {
    await this.db.delete(emailCodes).where(this.match(email, purpose));
  }
}
