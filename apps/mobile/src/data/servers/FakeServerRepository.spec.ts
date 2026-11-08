import { DEFAULT_EVERYONE_PERMISSIONS, ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  createFakeServerRepository,
  FAKE_FULL_NAME,
  FAKE_NETWORK_NAME,
} from './FakeServerRepository';

const repo = createFakeServerRepository(0);

describe('FakeServerRepository (EXPO_PUBLIC_FAKE=servers)', () => {
  it('builds the general template like SRV-01 AC1', async () => {
    const s = await repo.createServer({
      name: 'CLB Guitar PTIT',
      template: 'general',
    });
    expect(s.channels.map((c) => [c.type, c.name])).toEqual([
      ['category', 'Kênh chung'],
      ['text', 'general'],
      ['voice', 'Phòng thoại chung'],
    ]);
    expect(s.system_channel_id).toBe(s.channels[1]!.id);
    expect(s.roles[0]!.permissions).toBe(String(DEFAULT_EVERYONE_PERMISSIONS));
  });

  it('plays 40011, 40001 and a lost request', async () => {
    const code = (name: string, template = 'general' as const) =>
      repo
        .createServer({ name, template })
        .catch((e: { code?: number }) => e.code ?? e);
    expect(await code(FAKE_FULL_NAME)).toBe(ErrorCode.MaxServersReached);
    expect(await code('A')).toBe(ErrorCode.ValidationError);
    expect(await code(FAKE_NETWORK_NAME)).toBeInstanceOf(TypeError);
  });
});
