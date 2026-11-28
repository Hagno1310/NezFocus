import { DEFAULT_USER_SETTINGS } from '../account/settings.contract.js';
import { parseDispatch } from '../gateway/events.contract.js';
import {
  CreateRelationshipRequest,
  LookupRelationship,
  REQUEST_MESSAGE_MAX,
  UpdateRelationshipRequest,
  UserLookupQuery,
  normalizeUsernameQuery,
} from './relationship.contract.js';

const mai = {
  id: '9',
  username: 'mai.tran',
  display_name: 'Mai',
  avatar: null,
};

// P2-B2.1 (#110): REQ-FRIEND-01..04, SRS 5.3 Friend, 5.4 RELATIONSHIP_*.
describe('relationship contract', () => {
  it('normalizes a looked-up username: trims, drops one "@", lowercases', () => {
    expect(normalizeUsernameQuery('  @Mai.Tran ')).toBe('mai.tran');
    expect(normalizeUsernameQuery('@@mai')).toBe('@mai');
    expect(UserLookupQuery.parse({ username: ' @Mai.Tran' })).toEqual({
      username: 'mai.tran',
    });
  });

  it('FRIEND-01 AC8: a 151-character message is rejected on the message field', () => {
    const ok = 'a'.repeat(REQUEST_MESSAGE_MAX);
    expect(
      CreateRelationshipRequest.safeParse({ username: 'mai.tran', message: ok })
        .success,
    ).toBe(true);
    const res = CreateRelationshipRequest.safeParse({
      username: 'mai.tran',
      message: `${ok}a`,
    });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.path).toEqual(['message']);
  });

  it('takes a username or a user_id, not both and not neither', () => {
    for (const body of [{ username: 'mai.tran' }, { user_id: '9' }])
      expect(CreateRelationshipRequest.safeParse(body).success).toBe(true);
    for (const body of [{}, { username: 'mai.tran', user_id: '9' }])
      expect(CreateRelationshipRequest.safeParse(body).success).toBe(false);
  });

  it('an empty message is no message', () => {
    expect(
      CreateRelationshipRequest.parse({ user_id: '9', message: '   ' }),
    ).toEqual({ user_id: '9' });
  });

  it('PUT accepts (friend) or blocks, nothing else', () => {
    expect(
      UpdateRelationshipRequest.safeParse({ type: 'friend' }).success,
    ).toBe(true);
    expect(
      UpdateRelationshipRequest.safeParse({ type: 'blocked' }).success,
    ).toBe(true);
    expect(
      UpdateRelationshipRequest.safeParse({ type: 'outgoing' }).success,
    ).toBe(false);
  });

  it('FRIEND-01 AC9: lookup has no "blocked by them" value', () => {
    expect(LookupRelationship.options).toEqual([
      'none',
      'friend',
      'incoming',
      'outgoing',
      'blocked',
    ]);
  });

  it('parses RELATIONSHIP_ADD / RELATIONSHIP_REMOVE and READY.relationships', () => {
    const rel = {
      user: mai,
      type: 'incoming',
      request_message: 'Chào An, mình là Mai lớp Giải tích 2 nè!',
      created_at: '2026-11-20T12:48:00.000Z',
    };
    expect(
      parseDispatch({ op: 0, s: 1, t: 'RELATIONSHIP_ADD', d: rel })?.d,
    ).toEqual(rel);
    expect(
      parseDispatch({
        op: 0,
        s: 2,
        t: 'RELATIONSHIP_REMOVE',
        d: { user_id: '9', type: 'incoming' },
      })?.d,
    ).toEqual({ user_id: '9', type: 'incoming' });
    const ready = parseDispatch({
      op: 0,
      s: 3,
      t: 'READY',
      d: {
        session_id: '1',
        user: {
          id: '1',
          email: 'an.nguyen@gmail.com',
          username: 'an.nguyen',
          display_name: 'An',
          bio: null,
          avatar: null,
          account_completed: true,
          deletion_scheduled_at: null,
          created_at: '2026-10-01T08:00:00.000Z',
        },
        servers: [],
        preferred_status: 'online',
        presences: [],
        settings: DEFAULT_USER_SETTINGS,
        read_states: [],
        relationships: [rel],
        private_channels: [],
        voice_states: [],
        focus_sessions: [],
        backend_time: '2026-10-18T14:47:00.000Z',
      },
    });
    expect(ready?.t === 'READY' && ready.d.relationships).toEqual([rel]);
  });
});
