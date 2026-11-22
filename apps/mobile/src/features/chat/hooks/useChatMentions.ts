import {
  Permission,
  hasPermission,
  memberName,
  mentionToken,
  type MessageResponse,
} from '@nezfocus/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { serverRepository } from '../../../data/servers';
import { friendsStore } from '../../../domain/friends/friends';
import type { MentionNode } from '../../../domain/messages/markdown';
import {
  concernsMe,
  insertMention,
  suggestChannels,
  suggestMentions,
  type PickedMention,
  type Suggestion,
  type Trigger,
} from '../../../domain/messages/mentions';
import { presenceStore } from '../../../domain/presence/presence';
import { homeStore, openChannel } from '../../../domain/servers/homeStore';
import type { MentionView } from '../../../shared/ui/MessageText';
import type { SuggestSection } from '../../../shared/ui/MentionSuggest';
import { avatarUri } from '../../me/avatarUri';
import { useMembers } from '../../servers/hooks/useMembers';
import { useServerAccess } from '../../servers/hooks/useServerAccess';

const NO_IDS: string[] = [];

// REQ-MSG-03 in one channel: who / what can be mentioned, how mentions in a message look,
// which messages concern me, and whose messages are folded (FRIEND-03 AC2).
export function useChatMentions(
  serverId: string | null,
  channelId: string,
  trigger: Trigger | null,
) {
  const { t } = useTranslation();
  const access = useServerAccess(serverId);
  const myId = access?.userId ?? '';
  const myRoleIds = access?.roleIds ?? NO_IDS;
  const channels = useStore(homeStore, (s) =>
    serverId ? s.channels[serverId] : undefined,
  );
  const channel = channels?.find((c) => c.id === channelId);
  const roles = useStore(homeStore, (s) =>
    serverId ? s.roles[serverId] : undefined,
  );
  const members = useMembers(serverId ?? '', channelId).data;
  const others = useStore(presenceStore, (s) => s.others);
  const byUser = useStore(friendsStore, (s) => s.byUser);
  // "{N} thành viên": counts only come with the role list; asked once roles are suggested.
  const counts = useQuery({
    queryKey: ['servers', serverId, 'roles'],
    queryFn: () => serverRepository.listRoles(serverId!),
    enabled: !!serverId && trigger?.kind === '@',
  }).data;

  const canMentionEveryone =
    !!access &&
    !!channel &&
    hasPermission(access.channelPerms(channel), Permission.MENTION_EVERYONE);

  const blocked = useMemo(
    () =>
      new Set(
        Object.values(byUser)
          .filter((r) => r.type === 'blocked')
          .map((r) => r.user.id),
      ),
    [byUser],
  );

  const names = useMemo(
    () => new Map((members ?? []).map((m) => [m.user.id, memberName(m)])),
    [members],
  );

  // C-27 rows for what is being typed, and what each row inserts.
  const suggestion = useMemo(() => {
    if (!trigger) return null;
    const groups =
      trigger.kind === '#'
        ? [
            {
              title: 'channels' as const,
              items: suggestChannels(trigger.query, channels ?? []),
            },
          ].filter((g) => g.items.length)
        : suggestMentions({
            query: trigger.query,
            members: members ?? [],
            online: (id) => (others[id]?.status ?? 'offline') !== 'offline',
            myId,
            roles: (roles ?? []).map((r) => ({
              id: r.id,
              name: r.name,
              mentionable: r.is_mentionable,
              count: counts?.find((c) => c.id === r.id)?.member_count ?? 0,
            })),
            serverId: serverId ?? '',
            canMentionEveryone,
            withRoles: !!serverId,
          });
    const picks = new Map<string, PickedMention>();
    const sections: SuggestSection[] = groups.map((g) => ({
      title: g.title && t(`chat.suggest.${g.title}`),
      rows: g.items.map((s: Suggestion) => {
        const key = s.kind === 'everyone' ? s.name : `${s.kind}:${s.id}`;
        picks.set(key, {
          label:
            s.kind === 'channel'
              ? `#${s.name}`
              : s.kind === 'everyone'
                ? s.name
                : `@${s.name}`,
          token:
            s.kind === 'member'
              ? mentionToken.user(s.id)
              : s.kind === 'role'
                ? mentionToken.role(s.id)
                : s.kind === 'channel'
                  ? mentionToken.channel(s.id)
                  : s.name,
        });
        return s.kind === 'member'
          ? {
              kind: 'member' as const,
              key,
              name: s.name,
              sub: s.username,
              uri: avatarUri(s.avatar, '128'),
            }
          : s.kind === 'channel'
            ? { kind: 'channel' as const, key, name: s.name }
            : {
                kind: 'group' as const,
                key,
                name: s.name,
                sub:
                  s.kind === 'role'
                    ? t('chat.suggest.roleMembers', { count: s.count })
                    : null,
              };
      }),
    }));
    return {
      sections,
      pick: (key: string, text: string, cursor: number) => {
        const picked = picks.get(key)!;
        return {
          ...insertMention(text, trigger, cursor, picked.label),
          picked,
        };
      },
    };
  }, [
    trigger,
    channels,
    members,
    others,
    myId,
    roles,
    counts,
    serverId,
    canMentionEveryone,
    t,
  ]);

  // C-10 › Mention trong chữ, for one message.
  const viewOf = (
    m: Pick<
      MessageResponse,
      'mention_role_ids' | 'mention_everyone' | 'mention_user_ids'
    >,
  ): MentionView => ({
    label: (n: MentionNode) => {
      if (n.kind === 'everyone') return `@${n.id}`;
      const name =
        n.kind === 'user'
          ? names.get(n.id)
          : n.kind === 'role'
            ? roles?.find((r) => r.id === n.id)?.name
            : channels?.find((c) => c.id === n.id)?.name;
      const sign = n.kind === 'channel' ? '#' : '@';
      return `${sign}${name ?? t('chat.unknownMention')}`;
    },
    // MSG-03 AC1: only what worked is a chip; @everyone without the right stays text.
    chip: (n) =>
      n.kind === 'everyone'
        ? m.mention_everyone
        : n.kind === 'role'
          ? m.mention_role_ids.includes(n.id)
          : true,
    isMe: (n) =>
      n.kind === 'user'
        ? n.id === myId
        : n.kind === 'role'
          ? myRoleIds.includes(n.id)
          : n.kind === 'everyone',
    // Tapping @Bình opens S-HOME-10 with P2-B3.4 (#117); until then nothing.
    onPress: (n) => {
      if (
        n.kind === 'channel' &&
        serverId &&
        channels?.some((c) => c.id === n.id)
      )
        openChannel({ serverId, channelId: n.id });
    },
  });

  return {
    myId,
    suggestion,
    blocked,
    viewOf,
    concerns: (m: Parameters<typeof concernsMe>[0]) =>
      !!serverId && concernsMe(m, myId, myRoleIds), // CR-12: never in a DM
  };
}
