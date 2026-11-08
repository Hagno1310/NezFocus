import type {
  ChannelResponse,
  DispatchEvent,
  ServerResponse,
  ServerSummary,
} from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import {
  channelSections,
  emptyHome,
  railInitials,
  reduceHome,
  type HomeState,
} from './drawer';

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
  permissions_synced: true,
});

// "Ôn thi Giải tích 2" (02 › Dữ liệu mẫu).
const INFO = ch('10', 'category', 'THÔNG TIN', null, 0);
const ROOMS = ch('20', 'category', 'PHÒNG HỌC', null, 1);
const CHANNELS = [
  ROOMS,
  ch('22', 'voice', 'Phòng thảo luận nhóm', '20', 1),
  ch('21', 'voice', 'Phòng học im lặng', '20', 0),
  INFO,
  ch('11', 'text', 'chao-mung', '10', 0),
  ch('14', 'text', 'hoi-dap', '10', 3),
  ch('12', 'text', 'thong-bao', '10', 1),
];

const summary = (id: string, name: string): ServerSummary => ({
  id,
  name,
  icon_url: null,
  owner_id: '1',
  template: 'study_server',
  system_channel_id: null,
  member_count: 24,
  created_at: '2026-10-01T01:00:00.000Z',
});

const names = (rows: readonly ChannelResponse[]) => rows.map((r) => r.name);

describe('railInitials (C-26: first letters of the first two words)', () => {
  it('ÔT, NĐ, CG; one word gives one letter', () => {
    expect(railInitials('Ôn thi Giải tích 2')).toBe('ÔT');
    expect(railInitials('Nhóm đồ án Mobile')).toBe('NĐ');
    expect(railInitials('CLB Guitar PTIT')).toBe('CG');
    expect(railInitials('  câu lạc bộ ')).toBe('CL');
    expect(railInitials('Guitar')).toBe('G');
  });
});

describe('channelSections (S-HOME-02)', () => {
  it('categories in order, channels by position', () => {
    const sections = channelSections(CHANNELS, new Set(), null);
    expect(sections.map((s) => s.category?.name)).toEqual([
      'THÔNG TIN',
      'PHÒNG HỌC',
    ]);
    expect(names(sections[0]!.rows)).toEqual([
      'chao-mung',
      'thong-bao',
      'hoi-dap',
    ]);
    expect(names(sections[1]!.rows)).toEqual([
      'Phòng học im lặng',
      'Phòng thảo luận nhóm',
    ]);
  });

  it('uncategorized: channels without a category come first, no header, by position (SRV-02 v1.8)', () => {
    const top = [
      ch('31', 'text', 'tai-lieu', null, 1),
      ch('30', 'text', 'chung', null, 0),
    ];
    const sections = channelSections([...CHANNELS, ...top], new Set(), null);
    expect(sections[0]!.category).toBeNull();
    expect(names(sections[0]!.rows)).toEqual(['chung', 'tai-lieu']);
    expect(sections[1]!.category?.name).toBe('THÔNG TIN');
  });

  it('collapsed: only the selected channel stays under the header', () => {
    const sections = channelSections(CHANNELS, new Set(['10']), '14');
    expect(sections[0]).toMatchObject({ collapsed: true });
    expect(names(sections[0]!.rows)).toEqual(['hoi-dap']);
    expect(sections[1]).toMatchObject({ collapsed: false });
  });

  it('a channel whose category the caller cannot see sits on top', () => {
    const sections = channelSections(
      [ch('41', 'text', 'rieng', '99', 0)],
      new Set(),
      null,
    );
    expect(sections).toEqual([
      { category: null, collapsed: false, rows: [expect.anything()] },
    ]);
  });
});

const event = (e: Omit<DispatchEvent, 's'>) =>
  ({ ...e, s: 1 }) as DispatchEvent;

const loaded: HomeState = {
  ...emptyHome,
  servers: [summary('100', 'Ôn thi Giải tích 2')],
  selectedServerId: '100',
  channels: { '100': CHANNELS },
  open: { serverId: '100', channelId: '14' },
};

describe('reduceHome (Gateway events)', () => {
  it('READY lists the servers, selects the first one, forgets cached channels', () => {
    const { state } = reduceHome(
      { ...emptyHome, channels: { '100': CHANNELS } },
      event({
        t: 'READY',
        d: {
          session_id: '1',
          user: {} as never,
          servers: [summary('100', 'A'), summary('200', 'B')],
        },
      }),
    );
    expect(state.servers?.map((s) => s.id)).toEqual(['100', '200']);
    expect(state.selectedServerId).toBe('100');
    expect(state.channels).toEqual({});
  });

  it('READY without the open server closes it; no server at all → no-server', () => {
    const { state } = reduceHome(
      loaded,
      event({
        t: 'READY',
        d: { session_id: '1', user: {} as never, servers: [] },
      }),
    );
    expect(state).toMatchObject({
      servers: [],
      selectedServerId: null,
      open: null,
    });
  });

  it('SERVER_CREATE joins the rail at the bottom with its channels; SERVER_UPDATE renames', () => {
    const created: ServerResponse = {
      ...summary('300', 'CLB Guitar PTIT'),
      channels: [ch('301', 'text', 'general', null, 0)],
      roles: [],
    };
    let { state } = reduceHome(
      loaded,
      event({ t: 'SERVER_CREATE', d: created }),
    );
    expect(state.servers?.map((s) => s.name)).toEqual([
      'Ôn thi Giải tích 2',
      'CLB Guitar PTIT',
    ]);
    expect(state.servers?.[1]).not.toHaveProperty('channels');
    expect(state.channels['300']).toEqual(created.channels);
    ({ state } = reduceHome(
      state,
      event({
        t: 'SERVER_UPDATE',
        d: summary('300', 'CLB Guitar'),
      }),
    ));
    expect(state.servers?.[1]?.name).toBe('CLB Guitar');
  });

  it('CHANNEL_CREATE / UPDATE / DELETE edit the cached list of that server only', () => {
    let { state } = reduceHome(
      loaded,
      event({
        t: 'CHANNEL_CREATE',
        d: ch('15', 'text', 'hỏi-đáp-chung', null, 0),
      }),
    );
    expect(state.channels['100']).toHaveLength(CHANNELS.length + 1);
    ({ state } = reduceHome(
      state,
      event({
        t: 'CHANNEL_UPDATE',
        d: { ...ch('15', 'text', 'tai-lieu', '10', 4) },
      }),
    ));
    expect(state.channels['100']?.find((c) => c.id === '15')).toMatchObject({
      name: 'tai-lieu',
      parent_id: '10',
    });
    ({ state } = reduceHome(
      state,
      event({ t: 'CHANNEL_DELETE', d: { id: '15', server_id: '100' } }),
    ));
    expect(state.channels['100']).toEqual(CHANNELS);
    const other = reduceHome(
      loaded,
      event({
        t: 'CHANNEL_CREATE',
        d: { ...ch('9', 'text', 'x', null, 0), server_id: '999' },
      }),
    );
    expect(other.state.channels).toEqual(loaded.channels);
  });

  it('channel-removed: the open channel is deleted → first text channel left, and its name for the toast', () => {
    const { state, removed } = reduceHome(
      loaded,
      event({ t: 'CHANNEL_DELETE', d: { id: '14', server_id: '100' } }),
    );
    expect(removed).toBe('hoi-dap');
    expect(state.open).toEqual({ serverId: '100', channelId: '11' });
  });

  it('other events leave the state alone', () => {
    const r = reduceHome(loaded, event({ t: 'USER_UPDATE', d: {} as never }));
    expect(r).toEqual({ state: loaded });
  });
});
