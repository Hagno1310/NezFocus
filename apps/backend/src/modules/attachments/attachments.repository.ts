import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { attachments, type AttachmentRow } from './attachments.schema.js';

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

  async markClean(
    id: bigint,
    done: Pick<
      AttachmentRow,
      'contentType' | 'sizeBytes' | 'width' | 'height' | 'storageKey'
    >,
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
}
