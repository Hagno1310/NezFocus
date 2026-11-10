import { DispatchEvents, parseDispatch } from '../gateway/events.contract.js';
import {
  ChannelResponse,
  CreateChannelRequest,
  UpdateChannelPositionsRequest,
  UpdateChannelRequest,
} from './channel.contract.js';
import {
  CreateServerRequest,
  ServerResponse,
  UpdateServerRequest,
} from './server.contract.js';

const issueCodes = (r: { success: boolean; error?: { issues: unknown[] } }) =>
  (r.error?.issues ?? []).map(
    (i) => (i as { params?: { code?: string } }).params?.code,
  );

// "CLB Guitar PTIT" (02-home-chat › Dữ liệu mẫu): a server from the general template.
const channels = [
  {
    id: '200',
    server_id: '100',
    type: 'category',
    name: 'Kênh chung',
    parent_id: null,
    position: 0,
    focus_control: 'off',
    permissions_synced: true,
    permission_overwrites: [],
  },
  {
    id: '201',
    server_id: '100',
    type: 'text',
    name: 'general',
    parent_id: '200',
    position: 0,
    focus_control: 'off',
    permissions_synced: true,
    permission_overwrites: [],
  },
  {
    id: '202',
    server_id: '100',
    type: 'voice',
    name: 'Phòng thoại chung',
    parent_id: '200',
    position: 1,
    focus_control: 'off',
    permissions_synced: true,
    permission_overwrites: [],
  },
];
const server = {
  id: '100',
  name: 'CLB Guitar PTIT',
  icon_url: null,
  owner_id: '1',
  template: 'general',
  system_channel_id: '201',
  member_count: 1,
  created_at: '2026-10-18T13:12:00.000Z',
};
const full = {
  ...server,
  channels,
  roles: [
    {
      id: '100',
      name: '@everyone',
      permissions: '69442369',
      position: 0,
      is_mentionable: false,
    },
  ],
  me: { role_ids: [] }, // the Owner of a new server has no role
};

describe('server contract (SRS 5.3 Server, REQ-SRV-01)', () => {
  it('POST /servers takes a 2–100 character name and a template', () => {
    expect(
      CreateServerRequest.parse({
        name: '  CLB Guitar PTIT ',
        template: 'general',
      }),
    ).toEqual({ name: 'CLB Guitar PTIT', template: 'general' });
    expect(
      CreateServerRequest.safeParse({ name: 'A', template: 'general' }).success,
    ).toBe(false); // AC2
    expect(
      CreateServerRequest.safeParse({
        name: 'a'.repeat(101),
        template: 'general',
      }).success,
    ).toBe(false);
    expect(
      CreateServerRequest.safeParse({ name: 'Nhóm', template: 'club' }).success,
    ).toBe(false);
  });

  it('PATCH /servers/:id: null system_channel_id means "Không gửi"; the name rule applies', () => {
    expect(UpdateServerRequest.parse({ system_channel_id: null })).toEqual({
      system_channel_id: null,
    });
    expect(UpdateServerRequest.safeParse({ name: 'A' }).success).toBe(false);
    expect(UpdateServerRequest.safeParse({}).success).toBe(false);
  });

  it('the full server carries its categories, channels and @everyone', () => {
    expect(ServerResponse.parse(full)).toEqual(full);
    expect(
      ServerResponse.safeParse({
        ...full,
        roles: [{ ...full.roles[0], permissions: 69442369 }],
      }).success,
    ).toBe(false); // bitmaps travel as strings
  });
});

describe('channel contract (SRS 5.3 Server, REQ-SRV-02)', () => {
  it('a text channel name is saved normalized; nothing left → NO_LETTER_OR_DIGIT', () => {
    expect(
      CreateChannelRequest.parse({
        type: 'text',
        name: 'Hỏi Đáp Chung',
        parent_id: null,
      }),
    ).toMatchObject({ name: 'hỏi-đáp-chung' });
    const empty = CreateChannelRequest.safeParse({
      type: 'text',
      name: '???',
      parent_id: null,
    });
    expect(empty.success).toBe(false);
    expect(issueCodes(empty)).toContain('NO_LETTER_OR_DIGIT');
  });

  it('voice and category names stay as typed, 1–100 characters', () => {
    expect(
      CreateChannelRequest.parse({
        type: 'voice',
        name: 'Phòng học im lặng',
        parent_id: '200',
      }),
    ).toMatchObject({ name: 'Phòng học im lặng' });
    expect(
      CreateChannelRequest.safeParse({ type: 'category', name: '   ' }).success,
    ).toBe(false);
  });

  it('focus_control is everyone | off and only on a voice channel', () => {
    expect(
      CreateChannelRequest.safeParse({
        type: 'voice',
        name: 'Phòng ôn',
        parent_id: null,
        focus_control: 'managers',
      }).success,
    ).toBe(false);
    expect(
      CreateChannelRequest.parse({
        type: 'text',
        name: 'tai-lieu',
        parent_id: null,
        focus_control: 'everyone',
      }),
    ).not.toHaveProperty('focus_control');
  });

  it('a private channel lists the roles that may view it', () => {
    expect(
      CreateChannelRequest.parse({
        type: 'text',
        name: 'mod',
        parent_id: null,
        viewer_role_ids: ['300'],
      }),
    ).toMatchObject({ viewer_role_ids: ['300'] });
  });

  it('positions carry parent_id; PATCH /channels/:id takes a name', () => {
    expect(
      UpdateChannelPositionsRequest.parse([
        { id: '201', position: 0, parent_id: null },
      ]),
    ).toHaveLength(1);
    expect(UpdateChannelPositionsRequest.safeParse([]).success).toBe(false);
    expect(UpdateChannelRequest.parse({ name: ' Hỏi đáp ' })).toEqual({
      name: 'Hỏi đáp',
    });
  });

  it('a channel has its type, group, position and Phòng học setting', () => {
    expect(ChannelResponse.parse(channels[2])).toEqual(channels[2]);
  });
});

describe('server and channel events (SRS 5.4)', () => {
  it('READY lists the servers of the user, oldest joined first', () => {
    const d = {
      session_id: '42',
      user: {
        id: '1',
        email: 'an.nguyen@gmail.com',
        username: 'an.nguyen',
        display_name: 'An',
        account_completed: true,
        created_at: '2026-10-01T08:00:00.000Z',
      },
      servers: [server],
      preferred_status: 'online',
      presences: [],
    };
    expect(DispatchEvents.READY.parse(d)).toEqual(d);
  });

  it('parses SERVER_CREATE, SERVER_UPDATE and the CHANNEL_* events', () => {
    for (const [t, d] of [
      ['SERVER_CREATE', full],
      ['SERVER_UPDATE', server],
      ['CHANNEL_CREATE', channels[1]],
      ['CHANNEL_UPDATE', channels[1]],
      ['CHANNEL_DELETE', { id: '201', server_id: '100' }],
    ] as const)
      expect(parseDispatch({ op: 0, s: 1, t, d })).toEqual({ t, s: 1, d });
  });

  it('throws on a SERVER_CREATE without its channels', () => {
    expect(() =>
      parseDispatch({ op: 0, s: 1, t: 'SERVER_CREATE', d: server }),
    ).toThrow();
  });
});
