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

  it('lists the three sample servers; "Ôn thi Giải tích 2" opens on #chao-mung (02 › Dữ liệu mẫu)', async () => {
    const repo = createFakeServerRepository(0);
    expect(repo.summaries().map((s) => s.name)).toEqual([
      'Ôn thi Giải tích 2',
      'Nhóm đồ án Mobile',
      'CLB Guitar PTIT',
    ]);
    const s = await repo.getServer('100');
    const info = s.channels.find((c) => c.name === 'THÔNG TIN')!;
    expect(
      s.channels.filter((c) => c.parent_id === info.id).map((c) => c.name),
    ).toEqual(['chao-mung', 'thong-bao', 'tai-lieu', 'hoi-dap', 'viec-nhom']);
    expect(s.system_channel_id).toBe(s.channels[1]!.id);
    expect(
      s.channels.filter((c) => c.type === 'voice').map((c) => c.focus_control),
    ).toEqual(['everyone', 'everyone']);
    await expect(repo.getServer('999')).rejects.toMatchObject({
      code: ErrorCode.NotFound,
    });
  });

  it('a created server can be read back', async () => {
    const created = await repo.createServer({
      name: 'CLB Guitar PTIT',
      template: 'general',
    });
    expect(await repo.getServer(created.id)).toEqual(created);
  });
});

describe('FakeServerRepository channels (REQ-SRV-02)', () => {
  const fresh = () => createFakeServerRepository(0);
  const byName = async (r: ReturnType<typeof fresh>, name: string) =>
    (await r.getServer('100')).channels.find((c) => c.name === name)!;

  it('creates a text channel normalized, last in its category', async () => {
    const r = fresh();
    const info = await byName(r, 'THÔNG TIN');
    const c = await r.createChannel('100', {
      type: 'text',
      name: 'Tài liệu chương 5',
      parent_id: info.id,
    });
    expect(c).toMatchObject({
      name: 'tài-liệu-chương-5',
      parent_id: info.id,
      position: 5,
    });
  });

  it('a duplicate is 40001 on name; a voice channel follows the template', async () => {
    const r = fresh();
    const rooms = await byName(r, 'PHÒNG HỌC');
    await expect(
      r.createChannel('100', {
        type: 'voice',
        name: 'phòng học im lặng',
        parent_id: rooms.id,
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.ValidationError,
      errors: { name: [{ code: 'DUPLICATE_NAME' }] },
    });
    const v = await r.createChannel('100', {
      type: 'voice',
      name: 'Phòng ôn đề',
      parent_id: rooms.id,
    });
    expect(v.focus_control).toBe('everyone');
  });

  it('moves, renames and deletes a category (children go to the top group)', async () => {
    const r = fresh();
    const rooms = await byName(r, 'PHÒNG HỌC');
    const quiet = await byName(r, 'Phòng học im lặng');
    await r.setChannelPositions('100', [
      { id: quiet.id, position: 0, parent_id: null },
    ]);
    expect((await byName(r, 'Phòng học im lặng')).parent_id).toBeNull();
    await r.updateChannel(rooms.id, { name: 'Phòng ôn' });
    await r.deleteChannel(rooms.id);
    const after = (await r.getServer('100')).channels;
    expect(after.some((c) => c.name === 'Phòng ôn')).toBe(false);
    expect(
      after.find((c) => c.name === 'Phòng thảo luận nhóm')!.parent_id,
    ).toBeNull();
  });

  it('deleting the welcome channel clears it (SRV-01 v1.9)', async () => {
    const r = fresh();
    const welcome = await byName(r, 'chao-mung');
    await r.deleteChannel(welcome.id);
    expect((await r.getServer('100')).system_channel_id).toBeNull();
  });
});
