import { describe, expect, it } from 'vitest';
import { pushTarget } from './pushTarget';

describe('pushTarget (REQ-NOTIF-02 "bấm notification mở đúng màn hình")', () => {
  it('AC3: a mention or reply opens its message in its channel', () => {
    const data = {
      type: 'mention',
      id: '90',
      server_id: '22',
      channel_id: '33',
      message_id: '44',
    };
    const link = {
      kind: 'channel',
      serverId: '22',
      channelId: '33',
      messageId: '44',
    };
    expect(pushTarget(data)).toEqual({ kind: 'link', link });
    expect(pushTarget({ ...data, type: 'reply' })).toEqual({
      kind: 'link',
      link,
    });
  });

  it('a DM opens the DM at that message', () => {
    expect(
      pushTarget({ type: 'dm', id: '44', channel_id: '33', message_id: '44' }),
    ).toEqual({
      kind: 'link',
      link: { kind: 'dm', channelId: '33', messageId: '44' },
    });
  });

  it('a friend request opens the requests of S-DM-04', () => {
    expect(pushTarget({ type: 'friend_request', id: '91' })).toEqual({
      kind: 'friend-requests',
    });
  });

  it('owner_transferred opens the settings of that server (spec 06, SRV-05)', () => {
    expect(
      pushTarget({ type: 'owner_transferred', id: '92', server_id: '100' }),
    ).toEqual({ kind: 'server-settings', serverId: '100' });
  });

  it('(negative) ignores what is not one of our pushes', () => {
    expect(pushTarget(undefined)).toBeNull();
    expect(pushTarget({ open: 'solo' })).toBeNull(); // a Solo phase alert (STUDY-10)
    expect(pushTarget({ type: 'call', id: '1' })).toBeNull(); // P3-B6.4 (#158)
    expect(
      pushTarget({ type: 'mention', server_id: '22', channel_id: 'x' }),
    ).toBeNull();
    expect(pushTarget({ type: 'dm' })).toBeNull();
  });
});
