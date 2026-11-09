import {
  applyPositions,
  describeDuplicate,
  planCategoryDelete,
} from './channel-rules.js';
import type { ChannelResponse } from './channel.contract.js';

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
  permission_overwrites: [],
});

const EVERYONE_DENY_SEND = {
  target_id: '1',
  target_type: 'role' as const,
  allow: '0',
  deny: '512', // SEND_MESSAGES
};

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

describe('describeDuplicate (REQ-SRV-02 v1.9: what the field name sentence names)', () => {
  it('a channel names its category; an uncategorized one names none', () => {
    expect(describeDuplicate(server, server[4]!)).toEqual({
      kind: 'channel',
      type: 'voice',
      name: 'Phòng học im lặng',
      category: 'Phòng học',
    });
    expect(describeDuplicate(server, server[6]!)).toEqual({
      kind: 'channel',
      type: 'text',
      name: 'tai-lieu',
      category: null,
    });
  });

  it('a category is server-wide', () => {
    expect(describeDuplicate(server, INFO)).toEqual({
      kind: 'category',
      name: 'THÔNG TIN',
    });
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

  it('a synced channel leaving its category keeps the overwrites in force as its own (v1.8)', () => {
    const rooms = { ...ROOMS, permission_overwrites: [EVERYONE_DENY_SEND] };
    const own = ch('23', 'text', 'rieng', '20', 2, false);
    const r = applyPositions(
      [...server.map((c) => (c.id === '20' ? rooms : c)), own],
      [
        { id: '21', position: 1, parent_id: null },
        { id: '23', position: 2, parent_id: null },
      ],
    );
    expect(r).toMatchObject({
      ok: true,
      changed: [
        { id: '21', permission_overwrites: [EVERYONE_DENY_SEND] },
        { id: '23', permission_overwrites: [] }, // not synced: its own stay
      ],
    });
  });

  it('a synced channel moving to another category follows the new one, nothing copied', () => {
    const rooms = { ...ROOMS, permission_overwrites: [EVERYONE_DENY_SEND] };
    const r = applyPositions(
      server.map((c) => (c.id === '20' ? rooms : c)),
      [{ id: '21', position: 3, parent_id: '10' }],
    );
    expect(r).toMatchObject({
      ok: true,
      changed: [
        { id: '21', permissions_synced: true, permission_overwrites: [] },
      ],
    });
  });

  it('dropping #tai-lieu next to another #tai-lieu is a duplicate', () => {
    expect(
      applyPositions(server, [{ id: '30', position: 2, parent_id: '10' }]),
    ).toEqual({
      ok: false,
      reason: 'duplicate',
      duplicate: {
        kind: 'channel',
        type: 'text',
        name: 'tai-lieu',
        category: 'THÔNG TIN',
      },
    });
  });

  it('unknown or repeated channel; a category or a text channel as parent', () => {
    expect(
      applyPositions(server, [{ id: '99', position: 0, parent_id: null }]),
    ).toMatchObject({ ok: false, reason: 'unknown-channel' });
    expect(
      applyPositions(server, [{ id: '20', position: 0, parent_id: '10' }]),
    ).toMatchObject({ ok: false, reason: 'not-a-category' });
    expect(
      applyPositions(server, [{ id: '12', position: 0, parent_id: '11' }]),
    ).toMatchObject({ ok: false, reason: 'not-a-category' });
    expect(
      applyPositions(server, [
        { id: '12', position: 0, parent_id: '10' },
        { id: '12', position: 1, parent_id: '10' },
      ]),
    ).toMatchObject({ ok: false, reason: 'unknown-channel' });
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

  it("synced children keep the category's overwrites as their own (REQ-ROLE-03 v1.8)", () => {
    const rooms = { ...ROOMS, permission_overwrites: [EVERYONE_DENY_SEND] };
    const r = planCategoryDelete(
      server.map((c) => (c.id === '20' ? rooms : c)),
      rooms,
    );
    expect(r).toMatchObject({
      ok: true,
      moved: [
        { id: '21', permission_overwrites: [EVERYONE_DENY_SEND] },
        { id: '22', permission_overwrites: [EVERYONE_DENY_SEND] },
      ],
    });
  });

  it('a child named like a top channel blocks the delete', () => {
    expect(planCategoryDelete(server, INFO)).toEqual({
      ok: false,
      reason: 'duplicate',
      duplicate: {
        kind: 'channel',
        type: 'text',
        name: 'tai-lieu',
        category: null,
      },
    });
  });
});
