import { ErrorCode, type ServerResponse } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import type { ServerRepository } from './ServerRepository';
import {
  checkServerName,
  createServer,
  firstTextChannel,
} from './createServer';

const apiError = (code: number) => Object.assign(new Error('x'), { code });

const channel = (
  id: string,
  type: 'category' | 'text' | 'voice',
  parent_id: string | null,
  position: number,
) => ({
  id,
  server_id: '100',
  type,
  name: id,
  parent_id,
  position,
  focus_control: 'off' as const,
  permissions_synced: true,
});

// "CLB Guitar PTIT" (02 › Dữ liệu mẫu): what POST /servers returns for template general.
const server: ServerResponse = {
  id: '100',
  name: 'CLB Guitar PTIT',
  icon_url: null,
  owner_id: '1',
  template: 'general',
  system_channel_id: '201',
  member_count: 1,
  created_at: '2026-10-18T13:12:00.000Z',
  channels: [
    channel('200', 'category', null, 0),
    channel('202', 'voice', '200', 1),
    channel('201', 'text', '200', 0),
  ],
  roles: [],
};

const repo = (createServer: ServerRepository['createServer']) => ({
  createServer,
});

describe('checkServerName (SRV-01 AC2, checked on press)', () => {
  it('needs 2–100 characters after trimming', () => {
    expect(checkServerName(' A ')).toBe(false);
    expect(checkServerName('CLB Guitar PTIT')).toBe(true);
    expect(checkServerName('a'.repeat(101))).toBe(false);
  });
});

describe('createServer (S-HOME-06)', () => {
  it('created → opens the first text channel of the new server (#general)', async () => {
    const sent: unknown[] = [];
    const r = await createServer(
      repo(async (body) => (sent.push(body), server)),
      'general',
      '  CLB Guitar PTIT ',
    );
    expect(sent).toEqual([{ name: 'CLB Guitar PTIT', template: 'general' }]);
    expect(r).toEqual({ ok: true, server, channelId: '201' });
  });

  it('a too-short name never reaches the backend', async () => {
    const r = await createServer(
      repo(() => Promise.reject(new Error('no call'))),
      'general',
      'A',
    );
    expect(r).toEqual({ ok: false, error: 'name' });
  });

  it('AC3: 40011 is max-servers; 40001 is the name; no answer is network', async () => {
    const fails = (err: unknown) =>
      createServer(
        repo(() => Promise.reject(err)),
        'general',
        'CLB Guitar',
      );
    await expect(fails(apiError(ErrorCode.MaxServersReached))).resolves.toEqual(
      { ok: false, error: 'max-servers' },
    );
    await expect(fails(apiError(ErrorCode.ValidationError))).resolves.toEqual({
      ok: false,
      error: 'name',
    });
    await expect(
      fails(new TypeError('Network request failed')),
    ).resolves.toEqual({ ok: false, error: 'network' });
    await expect(fails(apiError(ErrorCode.InternalError))).resolves.toEqual({
      ok: false,
      error: 'other',
    });
  });
});

describe('firstTextChannel (SRV-01: open the first text channel one can view)', () => {
  it('uncategorized channels come first, then categories in order', () => {
    expect(
      firstTextChannel([
        channel('10', 'category', null, 0),
        channel('11', 'text', '10', 0),
        channel('12', 'text', null, 1),
        channel('13', 'voice', null, 0),
      ]),
    ).toBe('12');
    expect(
      firstTextChannel([
        channel('20', 'category', null, 1),
        channel('21', 'text', '20', 0),
        channel('10', 'category', null, 0),
        channel('11', 'text', '10', 3),
      ]),
    ).toBe('11');
  });

  it('null when the server has no text channel one can view', () => {
    expect(firstTextChannel([channel('13', 'voice', null, 0)])).toBeNull();
  });
});
