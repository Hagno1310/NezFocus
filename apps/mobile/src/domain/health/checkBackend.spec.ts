import { describe, expect, it } from 'vitest';
import { checkBackend } from './checkBackend';

describe('checkBackend', () => {
  it('reports up when the health check answers', async () => {
    await expect(
      checkBackend({ ping: async () => ({ status: 'ok', db: 'up' }) }),
    ).resolves.toBe('up');
  });

  // Backend answers 503 when the DB is down, so that also lands here.
  it('reports down when the request fails', async () => {
    await expect(
      checkBackend({ ping: () => Promise.reject(new Error('offline')) }),
    ).resolves.toBe('down');
  });
});
