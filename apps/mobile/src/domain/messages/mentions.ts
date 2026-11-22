import {
  compareMembers,
  memberName,
  searchKey,
  type MessageResponse,
  type ServerMember,
} from '@nezfocus/shared';

// C-27: at most 5 rows show, the list scrolls for the rest.
export const SUGGEST_ROWS = 5;

export type Trigger = { kind: '@' | '#'; query: string; start: number };

// The @ / # being typed right before the cursor (start of text or after a space).
export function activeTrigger(text: string, cursor: number): Trigger | null {
  const m = /(^|\s)([@#])([^\s@#]*)$/u.exec(text.slice(0, cursor));
  if (!m) return null;
  return {
    kind: m[2] as '@' | '#',
    query: m[3]!,
    start: m.index + m[1]!.length,
  };
}

// C-27 (chốt 31/10/2026): accents and case ignored, at the start of the name or of a word;
// username words split on . and _.
export function startsWord(text: string, query: string) {
  const q = searchKey(query);
  return (
    !q ||
    searchKey(text)
      .split(/[\s._-]+/)
      .some((w) => w.startsWith(q))
  );
}

export type Suggestion =
  | {
      kind: 'member';
      id: string;
      name: string;
      username: string | null;
      avatar: ServerMember['user']['avatar'];
    }
  | { kind: 'role'; id: string; name: string; count: number }
  | { kind: 'everyone'; name: '@everyone' | '@here' }
  | { kind: 'channel'; id: string; name: string };

export type SuggestGroup = {
  title: 'members' | 'roles' | 'channels' | null;
  items: Suggestion[];
};

type Role = { id: string; name: string; mentionable: boolean; count: number };

// CR-19 #14: THÀNH VIÊN → VAI TRÒ → @everyone / @here; empty groups are left out.
export function suggestMentions({
  query,
  members,
  online,
  myId,
  roles,
  serverId,
  canMentionEveryone,
  withRoles,
}: {
  query: string;
  members: readonly ServerMember[];
  online: (userId: string) => boolean;
  myId: string;
  roles: readonly Role[];
  serverId: string;
  canMentionEveryone: boolean;
  withRoles: boolean; // DM / Group DM: no VAI TRÒ
}): SuggestGroup[] {
  const people = members
    .filter(
      (m) =>
        m.user.id !== myId &&
        (startsWord(memberName(m), query) ||
          startsWord(m.user.username ?? '', query)),
    )
    .sort(
      (a, b) =>
        Number(online(b.user.id)) - Number(online(a.user.id)) ||
        compareMembers(a, b),
    )
    .map((m): Suggestion => ({
      kind: 'member',
      id: m.user.id,
      name: memberName(m),
      username: m.user.username,
      avatar: m.user.avatar,
    }));
  const roleItems = withRoles
    ? roles
        .filter(
          (r) =>
            r.id !== serverId &&
            (r.mentionable || canMentionEveryone) &&
            startsWord(r.name, query),
        )
        .map((r): Suggestion => ({
          kind: 'role',
          id: r.id,
          name: r.name,
          count: r.count,
        }))
    : [];
  const everyone = canMentionEveryone
    ? (['@everyone', '@here'] as const)
        .filter((n) => startsWord(n.slice(1), query))
        .map((name): Suggestion => ({ kind: 'everyone', name }))
    : [];
  const groups: SuggestGroup[] = [
    { title: 'members', items: people },
    { title: 'roles', items: roleItems },
    { title: null, items: everyone },
  ];
  return groups.filter((g) => g.items.length);
}

export function suggestChannels(
  query: string,
  channels: readonly { id: string; name: string | null; type: string }[],
): Suggestion[] {
  return channels
    .filter((c) => c.type === 'text' && startsWord(c.name ?? '', query))
    .map((c) => ({ kind: 'channel', id: c.id, name: c.name ?? '' }));
}

// The trigger and what was typed after it become the label and a space.
export function insertMention(
  text: string,
  trigger: Trigger,
  cursor: number,
  label: string,
) {
  const inserted = `${label} `;
  return {
    text: text.slice(0, trigger.start) + inserted + text.slice(cursor),
    cursor: trigger.start + inserted.length,
  };
}

export type PickedMention = { label: string; token: string };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The composer shows "@Bình"; what is sent is the token the backend reads (P2-A3.1 #99).
// ponytail: a picked label edited by hand stays plain text; a real chip input is v1.x.
export function encodeMentions(text: string, picked: readonly PickedMention[]) {
  let out = text;
  for (const p of [...picked].sort((a, b) => b.label.length - a.label.length))
    out = out.replace(
      new RegExp(`${escape(p.label)}(?![\\p{L}\\p{N}_])`, 'gu'),
      p.token,
    );
  return out;
}

type MentionFields = Pick<
  MessageResponse,
  'type' | 'mention_user_ids' | 'mention_role_ids' | 'mention_everyone'
> & { author: { id: string } };

// REQ-MSG-03 (CR-12): mentioned me, my role, or everyone; never my own; not system messages.
// ponytail: replies to my message join here with P3-A1 (#21).
export function concernsMe(
  m: MentionFields,
  myId: string,
  myRoleIds: readonly string[],
) {
  return (
    m.type === 'default' &&
    m.author.id !== myId &&
    (m.mention_everyone ||
      m.mention_user_ids.includes(myId) ||
      m.mention_role_ids.some((id) => myRoleIds.includes(id)))
  );
}
