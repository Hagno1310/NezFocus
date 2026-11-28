import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { notifications } from './notifications.schema.js';

// REQ-AUTH-10, CR-28 #42: the account purge drops the user's inbox. Owner: notifications
// (B); called by the account purge (A). Push tokens go with the sessions.
@Injectable()
export class NotificationsEraser {
  constructor(@Inject(DB) private readonly db: Db) {}

  async eraseUser(userId: bigint) {
    await this.db.delete(notifications).where(eq(notifications.userId, userId));
  }
}
