import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import type { Db } from '../../db/db.module.js';

const dbWith = (execute: () => Promise<unknown>) =>
  ({ execute }) as unknown as Db;

describe('HealthController', () => {
  it('reports ok when the database answers', async () => {
    const controller = new HealthController(dbWith(async () => ({})));
    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      db: 'up',
    });
  });

  it('returns 503 when the database is down', async () => {
    const controller = new HealthController(
      dbWith(() => Promise.reject(new Error('ECONNREFUSED'))),
    );
    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
