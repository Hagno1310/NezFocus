import { DEFAULT_USER_SETTINGS } from '../account/settings.contract.js';
import { parseDispatch } from '../gateway/events.contract.js';
import { CreateDmRequest, DmChannel } from './dm.contract.js';
import { UserProfile } from '../account/profile.contract.js';

const binh = {
  id: '2',
  username: 'binh.tran',
  display_name: 'Bình',
  avatar: null,
  deleted: false,
};
const dm: DmChannel = {
  id: '50',
  type: 'dm',
  recipient: binh,
  last_message_id: null,
};

// P2-B3.1 (#114): REQ-DM-01..03, AUTH-06 AC5, SRS 5.3 DM / Account, 5.4.
describe('DM contract', () => {
  it('a DM is opened with one recipient', () => {
    expect(CreateDmRequest.parse({ recipient_id: '2' })).toEqual({
      recipient_id: '2',
    });
    expect(CreateDmRequest.safeParse({}).success).toBe(false);
  });

  it('CHANNEL_CREATE carries a server channel or a DM', () => {
    const e = parseDispatch({ op: 0, s: 1, t: 'CHANNEL_CREATE', d: dm });
    expect(e?.d).toEqual(dm);
  });

  it('READY lists the open DMs', () => {
    const ready = {
      session_id: '1',
      user: {
        id: '1',
        email: 'an@nezfocus.app',
        username: 'an',
        display_name: 'An',
        avatar: null,
        bio: null,
        account_completed: true,
        created_at: '2026-10-01T00:00:00.000Z',
      },
      servers: [],
      preferred_status: 'online',
      presences: [],
      settings: DEFAULT_USER_SETTINGS,
      read_states: [],
      relationships: [],
      private_channels: [dm],
    };
    const e = parseDispatch({ op: 0, s: 1, t: 'READY', d: ready });
    expect(e?.t === 'READY' && e.d.private_channels).toEqual([dm]);
  });

  it("a deleted account's profile carries no name, no servers, no way to message", () => {
    expect(
      UserProfile.parse({
        user: {
          id: '9',
          username: null,
          display_name: null,
          avatar: null,
          bio: null,
        },
        deleted: true,
        relationship: 'none',
        mutual_servers: [],
        can_message: false,
      }).deleted,
    ).toBe(true);
  });
});
