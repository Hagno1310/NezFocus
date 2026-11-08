import { ErrorCode, type ChannelResponse } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  checkChannelName,
  createChannel,
  dropTarget,
  moveChannel,
  namePreview,
  planDrop,
  renameChannel,
  reorderEntries,
} from './channels';
import { channelSections } from './drawer';

const ch = (
  id: string,
  type: ChannelResponse['type'],
  name: string,
  parent_id: string | null,
  position: number,
): ChannelResponse => ({
  id,
  server_id: '100',
  type,
  name,
  parent_id,
  position,
  focus_control: type === 'voice' ? 'everyone' : 'off',
  permissions_synced: parent_id !== null,
});

// "Ôn thi Giải tích 2" (02 › Dữ liệu mẫu), with a `#viec-nhom` in PHÒNG HỌC for `drop-blocked`.
const INFO = ch('10', 'category', 'THÔNG TIN', null, 0);
const ROOMS = ch('20', 'category', 'PHÒNG HỌC', null, 1);
const server = [
  INFO,
  ch('11', 'text', 'chao-mung', '10', 0),
  ch('12', 'text', 'tai-lieu', '10', 1),
  ch('13', 'text', 'viec-nhom', '10', 2),
  ROOMS,
  ch('21', 'voice', 'Phòng học im lặng', '20', 0),
  ch('22', 'text', 'viec-nhom', '20', 1),
];

const apiError = (code: number, errors?: object) =>
  Object.assign(new Error('x'), { code, errors });

describe('namePreview (SRV-02 AC2: "Sẽ lưu là # …" only when it differs)', () => {
  it('a text channel shows the saved name when it differs from what was typed', () => {
    expect(namePreview('text', 'Tài liệu chương 5')).toBe('tài-liệu-chương-5');
    expect(namePreview('text', 'tài-liệu-chương-5')).toBeNull();
  });

  it('nothing for voice / category (AC3), an empty field, or "???" (the error says it)', () => {
    expect(namePreview('voice', 'Phòng ôn đề')).toBeNull();
    expect(namePreview('category', 'Đề cương')).toBeNull();
    expect(namePreview('text', '')).toBeNull();
    expect(namePreview('text', '???')).toBeNull();
  });
});

describe('checkChannelName (SRV-02 AC7, AC9)', () => {
  const at = (type: ChannelResponse['type'], name: string, parent_id = '20') =>
    checkChannelName(server, { type, name, parent_id });

  it('empty or blank → length; "???" → no letter or digit', () => {
    expect(at('text', '  ')).toEqual({ ok: false, error: { kind: 'length' } });
    expect(at('voice', '')).toEqual({ ok: false, error: { kind: 'length' } });
    expect(at('text', '???')).toEqual({
      ok: false,
      error: { kind: 'no-letter' },
    });
  });

  it('a voice channel in PHÒNG HỌC named like one there → duplicate', () => {
    expect(at('voice', 'phòng học im lặng')).toEqual({
      ok: false,
      error: {
        kind: 'duplicate',
        duplicate: {
          kind: 'channel',
          type: 'voice',
          name: 'Phòng học im lặng',
          category: 'PHÒNG HỌC',
        },
      },
    });
  });

  it('a text channel compares on its saved name; a category server-wide', () => {
    expect(at('text', 'Tai lieu', '10')).toMatchObject({
      ok: false,
      error: { kind: 'duplicate' },
    });
    expect(at('category', 'Thông tin', null as never)).toMatchObject({
      ok: false,
      error: { kind: 'duplicate', duplicate: { kind: 'category' } },
    });
  });

  it('returns the name to send: text normalized, the rest trimmed', () => {
    expect(at('text', 'Hỏi Đáp Chung', '10')).toEqual({
      ok: true,
      name: 'hỏi-đáp-chung',
    });
    expect(at('voice', '  Phòng ôn đề ')).toEqual({
      ok: true,
      name: 'Phòng ôn đề',
    });
  });

  it('renaming a channel to its own name is fine', () => {
    expect(
      checkChannelName(server, {
        id: '21',
        type: 'voice',
        name: 'Phòng học im lặng',
        parent_id: '20',
      }),
    ).toEqual({ ok: true, name: 'Phòng học im lặng' });
  });
});

describe('createChannel (S-SET-09)', () => {
  const created = ch('30', 'text', 'tài-liệu-chương-5', '10', 3);

  it('checks the name first, then sends type, name, category and focus_control', async () => {
    const sent: unknown[] = [];
    const repo = {
      createChannel: async (_id: string, body: unknown) => (
        sent.push(body),
        created
      ),
    };
    expect(
      await createChannel(repo, '100', server, {
        type: 'text',
        name: 'Tài liệu chương 5',
        parentId: '10',
        studyRoom: false,
      }),
    ).toEqual({ ok: true, channel: created });
    await createChannel(repo, '100', server, {
      type: 'voice',
      name: 'Phòng ôn đề',
      parentId: '20',
      studyRoom: true,
    });
    await createChannel(repo, '100', server, {
      type: 'category',
      name: 'Đề cương',
      parentId: '10',
      studyRoom: true,
    });
    expect(sent).toEqual([
      { type: 'text', name: 'tài-liệu-chương-5', parent_id: '10' },
      {
        type: 'voice',
        name: 'Phòng ôn đề',
        parent_id: '20',
        focus_control: 'everyone',
      },
      { type: 'category', name: 'Đề cương' },
    ]);
  });

  it('a duplicate never reaches the backend', async () => {
    const r = await createChannel(
      { createChannel: () => Promise.reject(new Error('no call')) },
      '100',
      server,
      {
        type: 'voice',
        name: 'phòng học im lặng',
        parentId: '20',
        studyRoom: true,
      },
    );
    expect(r).toMatchObject({ ok: false, error: { kind: 'duplicate' } });
  });

  it('maps 40001 name, 40001 MAX_CHANNELS, 40302 and a network failure', async () => {
    const fails = (err: unknown) =>
      createChannel({ createChannel: () => Promise.reject(err) }, '100', [], {
        type: 'voice',
        name: 'Phòng ôn đề',
        parentId: null,
        studyRoom: false,
      });
    expect(
      await fails(
        apiError(ErrorCode.ValidationError, {
          name: [{ code: 'DUPLICATE_NAME', message: 'Trên cùng danh sách …' }],
        }),
      ),
    ).toEqual({
      ok: false,
      error: { kind: 'server', message: 'Trên cùng danh sách …' },
    });
    expect(
      await fails(
        apiError(ErrorCode.ValidationError, {
          _: [{ code: 'MAX_CHANNELS', message: 'x' }],
        }),
      ),
    ).toEqual({ ok: false, error: { kind: 'limit' } });
    expect(await fails(apiError(ErrorCode.Forbidden))).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
    expect(await fails(new TypeError('Network request failed'))).toEqual({
      ok: false,
      error: { kind: 'network' },
    });
  });
});

describe('renameChannel (S-SET-06 overview)', () => {
  it('a text channel is checked on its saved name, excluding itself', async () => {
    const sent: unknown[] = [];
    const repo = {
      updateChannel: async (id: string, body: { name: string }) => (
        sent.push([id, body]),
        { ...server[3]!, name: body.name }
      ),
    };
    const r = await renameChannel(repo, server, server[3]!, 'Việc nhóm K22');
    expect(r).toMatchObject({ ok: true, channel: { name: 'việc-nhóm-k22' } });
    expect(sent).toEqual([['13', { name: 'việc-nhóm-k22' }]]);
    expect(await renameChannel(repo, server, server[3]!, 'Tai lieu')).toEqual({
      ok: false,
      error: {
        kind: 'duplicate',
        duplicate: {
          kind: 'channel',
          type: 'text',
          name: 'tai-lieu',
          category: 'THÔNG TIN',
        },
      },
    });
  });

  it('40302 / 40401 → forbidden (lost access or deleted)', async () => {
    const repo = (code: number) => ({
      updateChannel: () => Promise.reject(apiError(code)),
    });
    expect(
      await renameChannel(
        repo(ErrorCode.NotFound),
        server,
        server[5]!,
        'Phòng tối',
      ),
    ).toEqual({ ok: false, error: { kind: 'forbidden' } });
  });
});

describe('reorder (S-HOME-02 `reordering`, `drop-blocked`; SRV-02 AC1)', () => {
  const entries = reorderEntries(
    channelSections(server, new Set(), null),
    '13',
  );

  it('lists headers and rows in drawer order, without the dragged row', () => {
    expect(
      entries.map((e) =>
        e.kind === 'header' ? `[${e.category.name}]` : e.channel.name,
      ),
    ).toEqual([
      '[THÔNG TIN]',
      'chao-mung',
      'tai-lieu',
      '[PHÒNG HỌC]',
      'Phòng học im lặng',
      'viec-nhom',
    ]);
  });

  it('dropTarget: above the first header is the top group; under a header is that category', () => {
    expect(dropTarget(entries, 0)).toEqual({ parentId: null, index: 0 });
    expect(dropTarget(entries, 1)).toEqual({ parentId: '10', index: 0 });
    expect(dropTarget(entries, 3)).toEqual({ parentId: '10', index: 2 });
    expect(dropTarget(entries, 5)).toEqual({ parentId: '20', index: 1 });
    expect(dropTarget(entries, 6)).toEqual({ parentId: '20', index: 2 });
  });

  it('planDrop renumbers the target group and sends only what moved', () => {
    expect(planDrop(server, '13', { parentId: '10', index: 0 })).toEqual({
      ok: true,
      patch: [
        { id: '13', position: 0, parent_id: '10' },
        { id: '11', position: 1, parent_id: '10' },
        { id: '12', position: 2, parent_id: '10' },
      ],
      changed: [
        { ...server[3]!, position: 0 },
        { ...server[1]!, position: 1 },
        { ...server[2]!, position: 2 },
      ],
    });
  });

  it('dropping where it already is changes nothing', () => {
    expect(planDrop(server, '13', { parentId: '10', index: 2 })).toEqual({
      ok: true,
      patch: [],
      changed: [],
    });
  });

  it('to the top group it stops following the category', () => {
    expect(planDrop(server, '13', { parentId: null, index: 0 })).toMatchObject({
      ok: true,
      patch: [{ id: '13', position: 0, parent_id: null }],
      changed: [{ id: '13', parent_id: null, permissions_synced: false }],
    });
  });

  it('`drop-blocked`: #viec-nhom into PHÒNG HỌC, which already has one', () => {
    expect(planDrop(server, '13', { parentId: '20', index: 0 })).toEqual({
      ok: false,
      duplicate: {
        kind: 'channel',
        type: 'text',
        name: 'viec-nhom',
        category: 'PHÒNG HỌC',
      },
    });
  });
});

describe('moveChannel (SRV-02 AC1: save on drop)', () => {
  const target = { parentId: null, index: 0 };

  it('moves the rows first, then saves the patch', async () => {
    const applied: string[][] = [];
    const sent: unknown[] = [];
    const r = await moveChannel(
      { setChannelPositions: async (_s, body) => void sent.push(body) },
      '100',
      server,
      '13',
      target,
      (changed) => applied.push(changed.map((c) => `${c.id}:${c.parent_id}`)),
    );
    expect(r).toEqual({ ok: true });
    expect(applied).toEqual([['13:null']]);
    expect(sent).toEqual([[{ id: '13', position: 0, parent_id: null }]]);
  });

  it('`drop-blocked` moves nothing and calls nothing', async () => {
    const r = await moveChannel(
      { setChannelPositions: () => Promise.reject(new Error('no call')) },
      '100',
      server,
      '13',
      { parentId: '20', index: 0 },
      () => {
        throw new Error('no move');
      },
    );
    expect(r).toMatchObject({ ok: false, error: 'duplicate' });
  });

  it('a failed save puts back only the moved rows; retry moves them again', async () => {
    const applied: ChannelResponse[][] = [];
    let fail = true;
    const r = await moveChannel(
      {
        setChannelPositions: async () => {
          if (fail) throw new TypeError('Network request failed');
        },
      },
      '100',
      server,
      '13',
      target,
      (changed) => applied.push([...changed]),
    );
    expect(r).toMatchObject({ ok: false, error: 'failed' });
    expect(applied[1]).toEqual([server[3]]);
    fail = false;
    expect(await (r as { retry: () => Promise<unknown> }).retry()).toEqual({
      ok: true,
    });
    expect(applied[2]).toEqual([
      {
        ...server[3]!,
        position: 0,
        parent_id: null,
        permissions_synced: false,
      },
    ]);
  });
});
