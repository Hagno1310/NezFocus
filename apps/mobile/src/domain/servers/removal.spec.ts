import type { ServerSummary } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { emptyHome, reduceHome, type HomeState } from './drawer';
import {
  offlineRemovalToast,
  removalCleared,
  removalStore,
  studiedMinutes,
  type Removal,
} from './removal';

const server = (id: string, name: string): ServerSummary => ({
  id,
  name,
  icon_url: null,
  owner_id: 'an',
  template: 'study_server',
  system_channel_id: null,
  member_count: 24,
  created_at: '2026-10-01T00:00:00Z',
});
const home = (over: Partial<HomeState> = {}): HomeState => ({
  ...emptyHome,
  servers: [
    server('g1', 'Ôn thi Giải tích 2'),
    server('g2', 'Nhóm đồ án Mobile'),
    server('g3', 'CLB Guitar'),
  ],
  selectedServerId: 'g1',
  open: { serverId: 'g1', channelId: 'hoi-dap' },
  channels: { g1: [], g2: [] },
  myRoleIds: { g1: ['tn'] },
  myTimeouts: { g1: null },
  ...over,
});
const removed = (serverId: string, userId = 'me') =>
  ({
    t: 'SERVER_MEMBER_REMOVE',
    s: 1,
    d: { server_id: serverId, user_id: userId, action: 'ban', reason: null },
  }) as const;

describe('kicked / banned (REQ-ROLE-05 AC6)', () => {
  it('off the rail, the next server is shown, its data gone', () => {
    const { state } = reduceHome(home(), removed('g1'), 'me');
    expect(state.servers!.map((s) => s.id)).toEqual(['g2', 'g3']);
    expect(state.selectedServerId).toBe('g2');
    expect(state.open).toBeNull();
    expect(state.channels).toEqual({ g2: [] });
    expect(state.myRoleIds).toEqual({});
  });

  it('the last server on the rail → the one before; the only one → no server', () => {
    const last = reduceHome(
      home({ selectedServerId: 'g3', open: null }),
      removed('g3'),
      'me',
    );
    expect(last.state.selectedServerId).toBe('g2');
    const only = reduceHome(
      home({ servers: [server('g1', 'x')] }),
      removed('g1'),
      'me',
    );
    expect(only.state.selectedServerId).toBeNull();
  });

  it('another server shown stays shown; someone else removed changes nothing of mine', () => {
    const other = reduceHome(
      home({
        selectedServerId: 'g2',
        open: { serverId: 'g2', channelId: 'viec-nhom' },
      }),
      removed('g1'),
      'me',
    );
    expect(other.state.open).toEqual({
      serverId: 'g2',
      channelId: 'viec-nhom',
    });
    const before = home();
    expect(reduceHome(before, removed('g1', 'khanh'), 'me').state).toBe(before);
  });

  it('my own SERVER_MEMBER_UPDATE keeps my timeout (S-HOME-01 `timed-out`)', () => {
    const { state } = reduceHome(
      home(),
      {
        t: 'SERVER_MEMBER_UPDATE',
        s: 2,
        d: {
          server_id: 'g1',
          user: {
            id: 'me',
            username: 'an.nguyen',
            display_name: 'An',
            avatar: null,
          },
          role_ids: ['tn'],
          joined_at: '2026-10-01T00:00:00Z',
          timeout_until: '2026-10-18T14:30:00Z',
          timeout_reason: null,
        },
      },
      'me',
    );
    expect(state.myTimeouts.g1).toBe('2026-10-18T14:30:00Z');
  });
});

describe('`banned-in-room` minutes', () => {
  it('only from 1 minute', () => {
    expect(studiedMinutes(31 * 60 + 20)).toBe(31);
    expect(studiedMinutes(59)).toBeNull();
    expect(studiedMinutes(null)).toBeNull();
  });
});

describe('AC7 `removed-while-offline`', () => {
  const items = [
    { id: 'n1', serverName: 'Ôn thi Giải tích 2' },
    { id: 'n2', serverName: 'CLB Guitar PTIT' },
  ];
  it('one server → its name; two → "{N} server"; told before → nothing', () => {
    expect(offlineRemovalToast(items.slice(0, 1), new Set())).toEqual({
      ids: ['n1'],
      text: { kind: 'one', server: 'Ôn thi Giải tích 2' },
    });
    expect(offlineRemovalToast(items, new Set())?.text).toEqual({
      kind: 'many',
      count: 2,
    });
    expect(offlineRemovalToast(items, new Set(['n1', 'n2']))).toBeNull();
    expect(offlineRemovalToast(items, new Set(['n1']))?.ids).toEqual(['n2']);
  });
});

describe('deleted by the Owner, left (REQ-SRV-05 AC4, AC5)', () => {
  it('SERVER_DELETE takes the server off the rail like a kick; the next one is shown', () => {
    const { state } = reduceHome(
      home(),
      { t: 'SERVER_DELETE', s: 1, d: { id: 'g1' } },
      'me',
    );
    expect(state.servers!.map((s) => s.id)).toEqual(['g2', 'g3']);
    expect(state.selectedServerId).toBe('g2');
  });

  it('a Dialog only for kick, ban and "đã bị xóa"; leaving or my own delete has none', () => {
    const of = (action: Removal['action']): Removal => ({
      serverId: 'g1',
      serverName: 'Ôn thi Giải tích 2',
      action,
      reason: null,
      minutes: null,
    });
    for (const action of ['kick', 'ban', 'deleted'] as const) {
      removalStore.setState({ pending: of(action), shown: null });
      removalCleared();
      expect(removalStore.getState().shown?.action).toBe(action);
    }
    for (const action of ['left', 'deleted_here'] as const) {
      removalStore.setState({ pending: of(action), shown: null });
      removalCleared();
      expect(removalStore.getState()).toEqual({ pending: null, shown: null });
    }
  });
});
