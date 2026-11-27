import type { NezfocusLink } from '../messages/links';

export type PushTarget =
  { kind: 'link'; link: NezfocusLink } | { kind: 'friend-requests' }; // S-DM-04 `pending`

const ID = /^\d{1,20}$/;

// SRS 5.6 payload (strings, as FCM delivers data) → the screen a tap opens. Calls are
// P3-B6.4 (#158); anything else (a Solo alert) is not ours.
export function pushTarget(data: unknown): PushTarget | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const id = (key: string) => {
    const v = d[key];
    return typeof v === 'string' && ID.test(v) ? v : undefined;
  };
  const channelId = id('channel_id');
  const messageId = id('message_id');
  switch (d.type) {
    case 'mention':
    case 'reply': {
      const serverId = id('server_id');
      if (!serverId || !channelId) return null;
      return {
        kind: 'link',
        link: { kind: 'channel', serverId, channelId, messageId },
      };
    }
    case 'dm':
      if (!channelId) return null;
      return { kind: 'link', link: { kind: 'dm', channelId, messageId } };
    case 'friend_request':
      return { kind: 'friend-requests' };
    default:
      return null;
  }
}
