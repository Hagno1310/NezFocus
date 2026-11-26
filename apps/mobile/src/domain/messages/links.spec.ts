import { describe, expect, it } from 'vitest';
import { messageLinkOf, parseNezfocusLink } from './links';

describe('message links (REQ-MSG-05 CR-19)', () => {
  it('builds the server and the DM form', () => {
    expect(messageLinkOf('100', '7', '42')).toBe(
      'https://nezfocus.app/channels/100/7/42',
    );
    expect(messageLinkOf(null, '7', '42')).toBe('https://nezfocus.app/dm/7/42');
  });

  it('reads channel, message and DM links back, with or without a trailing slash', () => {
    expect(parseNezfocusLink('https://nezfocus.app/channels/100/7/42')).toEqual(
      {
        kind: 'channel',
        serverId: '100',
        channelId: '7',
        messageId: '42',
      },
    );
    expect(parseNezfocusLink('https://nezfocus.app/channels/100/7/')).toEqual({
      kind: 'channel',
      serverId: '100',
      channelId: '7',
      messageId: undefined,
    });
    expect(parseNezfocusLink('https://nezfocus.app/dm/7/42')).toEqual({
      kind: 'dm',
      channelId: '7',
      messageId: '42',
    });
  });

  it('leaves other paths and hosts as ordinary links', () => {
    for (const url of [
      'https://nezfocus.app/invite/k7Qm2xPa',
      'https://nezfocus.app/tasks/5',
      'https://nezfocus.app/channels/abc/7',
      'https://nezfocus.app/channels/1/2/3/4',
      'http://nezfocus.app/channels/1/2',
      'https://evil.app/channels/1/2',
      'không phải link',
    ])
      expect(parseNezfocusLink(url)).toBeNull();
  });
});
