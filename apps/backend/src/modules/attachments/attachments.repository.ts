import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { messages } from '../messaging/messages.schema.js';
import { servers } from '../servers/servers.schema.js';
import { users } from '../users/users.schema.js';
import { attachments, type AttachmentRow } from './attachments.schema.js';

const SWEEP_BATCH = 500;

@Injectable()
export class AttachmentsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(row: typeof attachments.$inferInsert) {
    await this.db.insert(attachments).values(row);
  }

  // Only the uploader ever sees their attachment here.
  async findOwn(
    id: bigint,
    uploaderId: bigint,
  ): Promise<AttachmentRow | undefined> {
    const [row] = await this.db
      .select()
      .from(attachments)
      .where(
        and(eq(attachments.id, id), eq(attachments.uploaderId, uploaderId)),
      );
    return row;
  }

  // A message image that went out on a message still there (REQ-MSG-05 AC3: deleted = gone).
  async sentImage(id: bigint): Promise<AttachmentRow | undefined> {
    const [row] = await this.db
      .select({ attachment: attachments })
      .from(attachments)
      .innerJoin(messages, eq(messages.id, attachments.messageId))
      .where(and(eq(attachments.id, id), isNull(messages.deletedAt)));
    return row?.attachment;
  }

  async markClean(
    id: bigint,
    done: Pick<
      AttachmentRow,
      'contentType' | 'sizeBytes' | 'width' | 'height' | 'storageKey'
    > &
      Partial<Pick<AttachmentRow, 'thumbnailKey'>>,
  ): Promise<AttachmentRow> {
    const [row] = await this.db
      .update(attachments)
      .set({ ...done, scanStatus: 'clean' })
      .where(eq(attachments.id, id))
      .returning();
    return row!;
  }

  async delete(id: bigint) {
    await this.db.delete(attachments).where(eq(attachments.id, id));
  }

  // SRS 8.2 "Job dọn attachment chưa gắn vào tin sau 24h": never completed, message images
  // never sent, and avatars / server icons no account or server uses any more. SRS 8.6:
  // images of a message deleted `deletedBefore` (30 days) ago go too.
  stale(before: Date, deletedBefore: Date): Promise<AttachmentRow[]> {
    const deletedLongAgo = sql`exists (select 1 from ${messages} where ${messages.id} = ${attachments.messageId} and ${messages.deletedAt} < ${deletedBefore})`;
    const usedAvatar = sql`exists (select 1 from ${users} where ${users.avatarKey} = ${attachments.storageKey})`;
    const usedIcon = sql`exists (select 1 from ${servers} where ${servers.iconKey} = ${attachments.storageKey})`;
    return this.db
      .select()
      .from(attachments)
      .where(
        or(
          deletedLongAgo,
          and(
            lt(attachments.createdAt, before),
            or(
              eq(attachments.scanStatus, 'pending'),
              and(
                eq(attachments.purpose, 'message'),
                isNull(attachments.messageId),
              ),
              and(
                ne(attachments.purpose, 'message'),
                sql`not ${usedAvatar}`,
                sql`not ${usedIcon}`,
              ),
            ),
          ),
        ),
      )
      .limit(SWEEP_BATCH);
  }

  async deleteMany(ids: bigint[]) {
    if (ids.length)
      await this.db.delete(attachments).where(inArray(attachments.id, ids));
  }
}
