import type { ChannelResponse } from '@nezfocus/shared';
import {
  applyPositions,
  duplicateNameMessage,
  planCategoryDelete,
} from './channel-rules.js';

const ch = (
  id: string,
  type: ChannelResponse['type'],
  name: string,
  parent_id: string | null,
  position: number,
  permissions_synced = true,
): ChannelResponse => ({
  id,
  server_id: '1',
  type,
  name,
  parent_id,
  position,
  focus_control: 'off',
  permissions_synced,
});

// "Ôn thi Giải tích 2" (02 › Dữ liệu mẫu), trimmed.
const INFO = ch('10', 'category', 'THÔNG TIN', null, 0);
const ROOMS = ch('20', 'category', 'Phòng học', null, 1);
const server = [
  INFO,
  ch('11', 'text', 'chao-mung', '10', 0),
  ch('12', 'text', 'tai-lieu', '10', 1),
  ROOMS,
  ch('21', 'voice', 'Phòng học im lặng', '20', 0),
  ch('22', 'text', 'viec-nhom', '20', 1),
  ch('30', 'text', 'tai-lieu', null, 0),
];

describe('duplicateNameMessage (REQ-SRV-02 v1.9: the three sentences of field name)', () => {
  it('a channel in a category names the category in capitals', () => {
    expect(duplicateNameMessage(server, server[2]!)).toBe(
      'THÔNG TIN đã có kênh #tai-lieu',
    );
    expect(duplicateNameMessage(server, server[4]!)).toBe(
      'PHÒNG HỌC đã có kênh Phòng học im lặng',
    );
  });

  it('an uncategorized channel is "Trên cùng danh sách"; a category is server-wide', () => {
    expect(duplicateNameMessage(server, server[6]!)).toBe(
      'Trên cùng danh sách đã có kênh #tai-lieu',
    );
    expect(duplicateNameMessage(server, INFO)).toBe(
      'Server đã có danh mục THÔNG TIN',
    );
  });
});

describe('applyPositions (REQ-SRV-02 AC1, v1.8 parent_id; REQ-ROLE-03 v1.8)', () => {
  it('moves #viec-nhom into THÔNG TIN: only what changed is returned, still synced', () => {
    const r = applyPositions(server, [
      { id: '22', position: 2, parent_id: '10' },
      { id: '11', position: 0, parent_id: '10' },
    ]);
    expect(r).toEqual({
      ok: true,
      changed: [{ ...server[5]!, parent_id: '10', position: 2 }],
    });
  });

  it('taking a channel out of its category stops the sync', () => {
    const r = applyPositions(server, [
      { id: '21', position: 1, parent_id: null },
    ]);
    expect(r).toMatchObject({
      ok: true,
      changed: [{ id: '21', parent_id: null, permissions_synced: false }],
    });
  });

  it('dropping #tai-lieu next to another #tai-lieu is 40001 on name', () => {
    expect(
      applyPositions(server, [{ id: '30', position: 2, parent_id: '10' }]),
    ).toEqual({
      ok: false,
      field: 'name',
      code: 'DUPLICATE_NAME',
      message: 'THÔNG TIN đã có kênh #tai-lieu',
    });
  });

  it('unknown channel, a category inside a category, a text channel as parent: 40001', () => {
    expect(
      applyPositions(server, [{ id: '99', position: 0, parent_id: null }]),
    ).toMatchObject({ ok: false, field: 'id' });
    expect(
      applyPositions(server, [{ id: '20', position: 0, parent_id: '10' }]),
    ).toMatchObject({ ok: false, field: 'parent_id' });
    expect(
      applyPositions(server, [{ id: '12', position: 0, parent_id: '11' }]),
    ).toMatchObject({ ok: false, field: 'parent_id' });
    expect(
      applyPositions(server, [
        { id: '12', position: 0, parent_id: '10' },
        { id: '12', position: 1, parent_id: '10' },
      ]),
    ).toMatchObject({ ok: false, field: 'id' });
  });
});

describe('planCategoryDelete (REQ-SRV-02 AC5)', () => {
  it('children go to the top group, after its channels, in their order, unsynced', () => {
    expect(planCategoryDelete(server, ROOMS)).toEqual({
      ok: true,
      moved: [
        {
          ...server[4]!,
          parent_id: null,
          position: 1,
          permissions_synced: false,
        },
        {
          ...server[5]!,
          parent_id: null,
          position: 2,
          permissions_synced: false,
        },
      ],
    });
  });

  it('a child named like a top channel blocks the delete (40001 on name)', () => {
    expect(planCategoryDelete(server, INFO)).toEqual({
      ok: false,
      field: 'name',
      code: 'DUPLICATE_NAME',
      message: 'Trên cùng danh sách đã có kênh #tai-lieu',
    });
  });
});
