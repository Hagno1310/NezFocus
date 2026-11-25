import type { DmChannel } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { createTestDb } from '../db/testDb';
import { createLocalDms } from './localDms';

const dm = (id: string): DmChannel => ({
  id,
  type: 'dm',
  recipient: {
    id: `9${id}`,
    username: 'chi.le',
    display_name: 'Chi',
    avatar: null,
    deleted: false,
  },
  last_message_id: null,
  last_message: null,
});

describe('local DM list (SRS 8.7)', () => {
  it('keeps the last list written, and only that', async () => {
    const db = createTestDb();
    const local = createLocalDms(async () => db);
    await local.replace([dm('50'), dm('51')]);
    await local.replace([dm('51'), dm('52')]);
    expect((await local.all()).map((d) => d.id).sort()).toEqual(['51', '52']);
  });
});
