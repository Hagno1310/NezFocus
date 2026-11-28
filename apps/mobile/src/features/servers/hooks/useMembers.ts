import type { ServerMember } from '@nezfocus/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { serverRepository } from '../../../data/servers';
import { onGatewayEvent } from '../../../domain/gateway/gatewayStore';
import { applyMemberEvent } from '../../../domain/servers/members';
import { roleErrorOf, type RoleError } from '../../../domain/servers/roles';

const membersRoot = (serverId: string) => ['servers', serverId, 'members'];
export const membersKey = (serverId: string, channelId?: string) => [
  ...membersRoot(serverId),
  channelId ?? 'all',
];

type List = readonly ServerMember[];

// REQ-ROLE-04: the server's members (or only who can view `channelId`), kept up in place by
// SERVER_MEMBER_* so the list on screen is never re-sorted (S-SET-03, S-HOME-03).
export function useMembers(serverId: string, channelId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: membersKey(serverId, channelId),
    queryFn: () => serverRepository.listMembers(serverId, channelId),
    enabled: !!serverId, // a DM has no server (S-DM-02)
  });
  useEffect(() => {
    const key = membersKey(serverId, channelId);
    return onGatewayEvent((e) => {
      // A newcomer or new roles may change who sees this channel: ask again, don't guess.
      if (
        channelId &&
        (e.t === 'SERVER_MEMBER_ADD' || e.t === 'SERVER_MEMBER_UPDATE')
      )
        void qc.invalidateQueries({ queryKey: key });
      else
        qc.setQueryData<List>(key, (list) =>
          list ? applyMemberEvent(list, serverId, e) : list,
        );
    });
  }, [qc, serverId, channelId]);
  return query;
}

// CR-28 #23: one role given or taken, shown at once in every member list of the server; a
// refusal puts the box back (S-SET-03 `save-error`).
export function useSetMemberRole(serverId: string) {
  const qc = useQueryClient();
  const patch = (userId: string, edit: (ids: string[]) => string[]) =>
    qc.setQueriesData<List>({ queryKey: membersRoot(serverId) }, (list) =>
      list?.map((m) =>
        m.user.id === userId ? { ...m, role_ids: edit(m.role_ids) } : m,
      ),
    );
  return async (
    userId: string,
    roleId: string,
    give: boolean,
  ): Promise<{ ok: true } | { ok: false; error: RoleError }> => {
    const without = (ids: string[]) => ids.filter((id) => id !== roleId);
    patch(userId, (ids) => (give ? [...without(ids), roleId] : without(ids)));
    try {
      await serverRepository.setMemberRole(serverId, userId, roleId, give);
      return { ok: true };
    } catch (err) {
      patch(userId, (ids) => (give ? without(ids) : [...without(ids), roleId]));
      return { ok: false, error: roleErrorOf(err) };
    }
  };
}
