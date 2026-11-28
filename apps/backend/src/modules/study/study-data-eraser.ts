import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { focusSessionParticipations } from './focus.schema.js';
import { soloSessions } from './solo.schema.js';
import { dailyStudyStats, userStudyStreaks } from './study.schema.js';

// REQ-AUTH-10 AC3 (CR-28 #42): the account purge drops the user's study data — minutes,
// streak, session history (SRS 8.6). Owner: study (B); called by the account purge (A).
@Injectable()
export class StudyDataEraser {
  constructor(@Inject(DB) private readonly db: Db) {}

  async eraseUser(userId: bigint) {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(focusSessionParticipations)
        .where(eq(focusSessionParticipations.userId, userId));
      await tx.delete(soloSessions).where(eq(soloSessions.userId, userId));
      await tx
        .delete(dailyStudyStats)
        .where(eq(dailyStudyStats.userId, userId));
      await tx
        .delete(userStudyStreaks)
        .where(eq(userStudyStreaks.userId, userId));
    });
  }
}
