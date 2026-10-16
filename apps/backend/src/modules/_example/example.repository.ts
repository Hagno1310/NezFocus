import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../../db/db.module.js';
import { examples, type ExampleRow } from './example.schema.js';

// The only place that touches the table; services stay testable with a fake.
@Injectable()
export class ExampleRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async insert(row: Pick<ExampleRow, 'id' | 'name'>): Promise<ExampleRow> {
    const [created] = await this.db.insert(examples).values(row).returning();
    return created;
  }

  async findById(id: bigint): Promise<ExampleRow | undefined> {
    const [row] = await this.db
      .select()
      .from(examples)
      .where(eq(examples.id, id));
    return row;
  }
}
