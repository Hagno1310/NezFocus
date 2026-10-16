import { ErrorCode } from '@nezfocus/shared';
import { AppError } from '../../common/app-error.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import type { ExampleRepository } from './example.repository.js';
import type { ExampleRow } from './example.schema.js';
import { ExampleService } from './example.service.js';

// Unit tests fake the repository; the DB path is covered by e2e tests.
const fakeRepo = () => {
  const rows = new Map<bigint, ExampleRow>();
  return {
    insert: async (r: Pick<ExampleRow, 'id' | 'name'>) => {
      const row = { ...r, createdAt: new Date() };
      rows.set(r.id, row);
      return row;
    },
    findById: async (id: bigint) => rows.get(id),
  } as unknown as ExampleRepository;
};

describe('ExampleService', () => {
  const service = new ExampleService(fakeRepo(), new SnowflakeGenerator(0));

  it('creates and reads back an example', async () => {
    const created = await service.create({ name: 'Ôn thi' });
    await expect(service.get(created.id)).resolves.toMatchObject({
      name: 'Ôn thi',
    });
  });

  it('throws NotFound (40401) for an unknown id', async () => {
    const err = await service.get(1n).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ code: ErrorCode.NotFound });
  });
});
