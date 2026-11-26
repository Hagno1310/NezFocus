import type { parseMentions } from '@nezfocus/shared';

type Parsed = ReturnType<typeof parseMentions>;

export type MentionVia =
  | { via: 'user' }
  | { via: 'role'; role_id: string }
  | { via: 'everyone' }
  | { via: 'here' }
  | { via: 'reply' }; // MSG-03 v1.9: a reply to their message (a `reply` inbox item)

// REQ-MSG-03: @role works when the role is mentionable or the sender has MENTION_EVERYONE;
// @everyone / @here need MENTION_EVERYONE. Anything else stays plain text (AC1).
export function allowedMentions(
  parsed: Parsed,
  {
    serverId,
    roles,
    canMentionEveryone,
  }: {
    serverId: string;
    roles: readonly { id: string; mentionable: boolean }[];
    canMentionEveryone: boolean;
  },
) {
  const wanted = new Set(parsed.mention_role_ids);
  return {
    roleIds: roles
      .filter(
        (r) =>
          wanted.has(r.id) &&
          r.id !== serverId &&
          (r.mentionable || canMentionEveryone),
      )
      .map((r) => r.id),
    everyone:
      canMentionEveryone && (parsed.mention_everyone || parsed.mention_here),
  };
}

// REQ-MSG-03 (CR-12): one item per person however often they are mentioned, never the sender.
// Every id given here can already view the channel.
export function mentionRecipients({
  authorId,
  userIds,
  roleMembers,
  everyoneIds,
  everyoneVia,
  replyAuthorId,
}: {
  authorId: string;
  userIds: readonly string[];
  roleMembers: readonly { roleId: string; userId: string }[];
  everyoneIds: readonly string[];
  everyoneVia: 'everyone' | 'here';
  replyAuthorId?: string; // can view the channel, like every id here
}): Map<string, MentionVia> {
  const out = new Map<string, MentionVia>();
  const add = (id: string, via: MentionVia) => {
    if (id !== authorId && !out.has(id)) out.set(id, via);
  };
  for (const id of userIds) add(id, { via: 'user' });
  for (const m of roleMembers)
    add(m.userId, { via: 'role', role_id: m.roleId });
  for (const id of everyoneIds) add(id, { via: everyoneVia });
  if (replyAuthorId) add(replyAuthorId, { via: 'reply' });
  return out;
}
