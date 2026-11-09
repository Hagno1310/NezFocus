import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { saveServer } from './updateServer';

const apiError = (code: number, errors?: object) =>
  Object.assign(new Error('x'), { code, errors });
const summary = { id: '100', name: 'Ôn thi Giải tích 2 – K22' } as never;

describe('saveServer (S-SET-01 overview)', () => {
  it('SRV-01 AC2: a 1-character name never reaches the backend', async () => {
    const r = await saveServer(
      { updateServer: () => Promise.reject(new Error('no call')) },
      '100',
      { name: ' A ' },
    );
    expect(r).toEqual({ ok: false, error: 'name' });
  });

  it('sends the trimmed name; the kênh tin chào mừng as is (null = Không gửi)', async () => {
    const sent: unknown[] = [];
    const repo = {
      updateServer: async (_id: string, body: unknown) => (
        sent.push(body),
        summary
      ),
    };
    expect(
      await saveServer(repo, '100', { name: ' Ôn thi Giải tích 2 – K22 ' }),
    ).toEqual({ ok: true, server: summary });
    await saveServer(repo, '100', { system_channel_id: null });
    expect(sent).toEqual([
      { name: 'Ôn thi Giải tích 2 – K22' },
      { system_channel_id: null },
    ]);
  });

  it('40302 / 40401 → forbidden (the screen closes); 40001 name → name; else failed', async () => {
    const fails = (err: unknown) =>
      saveServer({ updateServer: () => Promise.reject(err) }, '100', {
        system_channel_id: '11',
      });
    expect(await fails(apiError(ErrorCode.Forbidden))).toMatchObject({
      error: 'forbidden',
    });
    expect(await fails(apiError(ErrorCode.NotFound))).toMatchObject({
      error: 'forbidden',
    });
    expect(
      await fails(apiError(ErrorCode.ValidationError, { name: [{}] })),
    ).toMatchObject({ error: 'name' });
    expect(await fails(new TypeError('Network request failed'))).toMatchObject({
      error: 'failed',
    });
  });
});
