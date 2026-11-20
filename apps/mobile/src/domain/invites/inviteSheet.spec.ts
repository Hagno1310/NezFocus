import { ErrorCode, type InviteResponse } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  cachedInvite,
  createInviteCache,
  displayLink,
  getInvite,
  revokeInvite,
} from './inviteSheet';

const NOW = new Date('2026-10-18T13:12:00Z');
const invite = (o: Partial<InviteResponse> = {}): InviteResponse => ({
  code: 'k7Qm2xPa',
  server_id: '100',
  channel_id: '101',
  max_age: 604_800,
  max_uses: 0,
  uses: 0,
  expires_at: '2026-10-25T13:12:00.000Z',
  created_at: NOW.toISOString(),
  ...o,
});
const apiError = (code: number) => ({ code, message: 'x' });

describe('S-HOME-07 getInvite (REQ-SRV-03)', () => {
  it('asks for the given settings and keeps the result for offline', async () => {
    const asked: unknown[] = [];
    const cache = createInviteCache();
    const result = await getInvite(
      {
        createInvite: async (channelId, body) => {
          asked.push([channelId, body]);
          return invite();
        },
      },
      '101',
      { max_age: 604_800, max_uses: 0 },
      cache,
    );
    expect(result).toEqual({ ok: true, invite: invite() });
    expect(asked).toEqual([['101', { max_age: 604_800, max_uses: 0 }]]);
    expect(cachedInvite(cache, '101', NOW)).toEqual(invite());
  });

  it.each([
    [new TypeError('Network request failed'), 'network'],
    [apiError(ErrorCode.Forbidden), 'forbidden'],
    [apiError(ErrorCode.InternalError), 'other'],
  ] as const)('%s → error %s', async (err, error) => {
    const result = await getInvite(
      {
        createInvite: async () => {
          throw err;
        },
      },
      '101',
      { max_age: 604_800, max_uses: 0 },
      createInviteCache(),
    );
    expect(result).toEqual({ ok: false, error });
  });
});

describe('S-HOME-07 offline cache', () => {
  it('only gives back a live invite', () => {
    const cache = createInviteCache();
    cache.set('101', invite({ expires_at: '2026-10-18T13:00:00.000Z' }));
    expect(cachedInvite(cache, '101', NOW)).toBeNull();
    cache.set('101', invite({ max_uses: 5, uses: 5 }));
    expect(cachedInvite(cache, '101', NOW)).toBeNull();
    cache.set('101', invite({ expires_at: null }));
    expect(cachedInvite(cache, '101', NOW)).not.toBeNull();
  });

  it('forgets a revoked invite (SRV-03 AC4)', async () => {
    const cache = createInviteCache();
    cache.set('101', invite());
    const result = await revokeInvite(
      { revokeInvite: async () => {} },
      invite(),
      cache,
    );
    expect(result).toEqual({ ok: true });
    expect(cachedInvite(cache, '101', NOW)).toBeNull();
  });
});

describe('displayLink', () => {
  it('shows the link without https:// (S-HOME-07: never cut the code)', () => {
    expect(displayLink('https://nezfocus.app/invite/k7Qm2xPa')).toBe(
      'nezfocus.app/invite/k7Qm2xPa',
    );
  });
});
