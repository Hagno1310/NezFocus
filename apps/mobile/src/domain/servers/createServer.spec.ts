import { ErrorCode, type ServerResponse } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import type { ServerRepository } from './ServerRepository';
import { createServer, firstTextChannel } from './createServer';

const apiError = (code: number, errors?: object) =>
  Object.assign(new Error('x'), { code, errors });

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
  permission_overwrites: [],
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
  me: { role_ids: [] },
};

const repo = (createServer: ServerRepository['createServer']) => ({
  createServer,
});

describe('createServer (S-HOME-06)', () => {
  it('SRV-01 AC2: a 1-character name is caught before the backend (checked on press)', async () => {
    const r = await createServer(
      repo(() => Promise.reject(new Error('no call'))),
      'general',
      ' A ',
    );
    expect(r).toEqual({ ok: false, error: 'name' });
  });

  it('created → opens the first text channel of the new server (#general)', async () => {
    const sent: unknown[] = [];
    const r = await createServer(
      repo(async (body) => (sent.push(body), server)),
      'general',
      '  CLB Guitar PTIT ',
    );
    expect(sent).toEqual([{ name: 'CLB Guitar PTIT', template: 'general' }]);
    expect(r).toEqual({ ok: true, server, channel: server.channels[2] });
  });

  it('P1-A4.7 (#211): an uploaded icon goes along as icon_attachment_id', async () => {
    const sent: unknown[] = [];
    await createServer(
      repo(async (body) => (sent.push(body), server)),
      'general',
      'CLB Guitar PTIT',
      '9',
    );
    expect(sent).toEqual([
      { name: 'CLB Guitar PTIT', template: 'general', icon_attachment_id: '9' },
    ]);
  });

  it('a too-short name never reaches the backend', async () => {
    const r = await createServer(
      repo(() => Promise.reject(new Error('no call'))),
      'general',
      'A',
    );
    expect(r).toEqual({ ok: false, error: 'name' });
  });

  it('AC3: 40011 is max-servers; 40001 on name is the name; no answer is network', async () => {
    const fails = (err: unknown) =>
      createServer(
        repo(() => Promise.reject(err)),
        'general',
        'CLB Guitar',
      );
    await expect(fails(apiError(ErrorCode.MaxServersReached))).resolves.toEqual(
      { ok: false, error: 'max-servers' },
    );
    await expect(
      fails(
        apiError(ErrorCode.ValidationError, { name: [{ code: 'too_small' }] }),
      ),
    ).resolves.toEqual({ ok: false, error: 'name' });
    await expect(
      fails(apiError(ErrorCode.ValidationError, { template: [{ code: 'x' }] })),
    ).resolves.toEqual({ ok: false, error: 'other' });
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
    ).toMatchObject({ id: '12' });
    expect(
      firstTextChannel([
        channel('20', 'category', null, 1),
        channel('21', 'text', '20', 0),
        channel('10', 'category', null, 0),
        channel('11', 'text', '10', 3),
      ]),
    ).toMatchObject({ id: '11' });
  });

  it('null when the server has no text channel one can view', () => {
    expect(firstTextChannel([channel('13', 'voice', null, 0)])).toBeNull();
  });
});
