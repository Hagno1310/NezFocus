// REQ-MSG-05 "Link tin nhắn" (CR-19), SRS 7.3.5: the NezFocus links the app opens itself.
const ORIGIN = 'https://nezfocus.app';
const ID = /^\d{1,20}$/;

export type NezfocusLink =
  | { kind: 'channel'; serverId: string; channelId: string; messageId?: string }
  | { kind: 'dm'; channelId: string; messageId?: string };

// "Sao chép link tin": a server channel or a DM (serverId null).
export const messageLinkOf = (
  serverId: string | null,
  channelId: string,
  messageId: string,
) =>
  serverId
    ? `${ORIGIN}/channels/${serverId}/${channelId}/${messageId}`
    : `${ORIGIN}/dm/${channelId}/${messageId}`;

// null: not ours, or another NezFocus path (/invite/, /tasks/: links of their own, 02).
export function parseNezfocusLink(url: string): NezfocusLink | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.host !== 'nezfocus.app') return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (!parts.slice(1).every((p) => ID.test(p))) return null;
  const [kind, a, b, c] = parts;
  if (kind === 'channels' && a && b && parts.length <= 4)
    return { kind: 'channel', serverId: a, channelId: b, messageId: c };
  if (kind === 'dm' && a && parts.length <= 3)
    return { kind: 'dm', channelId: a, messageId: b };
  return null;
}
