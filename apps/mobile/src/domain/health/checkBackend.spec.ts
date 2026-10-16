import { describe, expect, it } from 'vitest';
import { checkBackend } from './checkBackend';

describe('checkBackend', () => {
  it('maps the health response to a status', async () => {
    await expect(
      checkBackend({ ping: async () => ({ status: 'ok', db: 'up' }) }),
    ).resolves.toBe('up');
    await expect(
      checkBackend({ ping: async () => ({ status: 'ok', db: 'down' }) }),
    ).resolves.toBe('degraded');
  });

  it('reports down when the request fails', async () => {
    await expect(
      checkBackend({ ping: () => Promise.reject(new Error('offline')) }),
    ).resolves.toBe('down');
  });
});
