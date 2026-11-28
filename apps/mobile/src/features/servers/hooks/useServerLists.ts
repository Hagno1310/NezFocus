import type { BanListResponse, ServerInviteList } from '@nezfocus/shared';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { inviteRepository } from '../../../data/invites';
import { serverRepository } from '../../../data/servers';
import { onGatewayEvent } from '../../../domain/gateway/gatewayStore';

const invitesKey = (serverId: string) => ['servers', serverId, 'invites'];
export const bansRoot = (serverId: string) => ['servers', serverId, 'bans'];

// S-SET-04 `invites`: no event tells about another person's invite, so it is read on open.
export function useServerInvites(serverId: string) {
  return useQuery({
    queryKey: invitesKey(serverId),
    queryFn: () => inviteRepository.listInvites(serverId),
    staleTime: 0,
  });
}

// `revoke-confirm` → the row goes at once (Toast "Đã thu hồi lời mời").
export function useRevokeInvite(serverId: string) {
  const qc = useQueryClient();
  return async (code: string) => {
    await inviteRepository.revokeInvite(code);
    qc.setQueryData<ServerInviteList>(invitesKey(serverId), (list) =>
      list?.filter((i) => i.code !== code),
    );
  };
}

type Pages = InfiniteData<BanListResponse, string | null>;

// S-SET-04 `bans`: newest ban first, page by page ("Rất nhiều người bị cấm"); SERVER_BAN_ADD /
// REMOVE (to BAN_MEMBERS) read it again.
export function useBans(serverId: string, q: string) {
  const qc = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: [...bansRoot(serverId), q],
    queryFn: ({ pageParam }) =>
      serverRepository.listBans(serverId, { q, after: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  useEffect(
    () =>
      onGatewayEvent((e) => {
        if (
          (e.t === 'SERVER_BAN_ADD' || e.t === 'SERVER_BAN_REMOVE') &&
          e.d.server_id === serverId
        )
          void qc.invalidateQueries({ queryKey: bansRoot(serverId) });
      }),
    [qc, serverId],
  );
  return query;
}

// `unban-confirm` (ROLE-07 AC2): out of every loaded page at once.
export function useUnban(serverId: string) {
  const qc = useQueryClient();
  return async (userId: string) => {
    await serverRepository.unbanMember(serverId, userId);
    qc.setQueriesData<Pages>(
      { queryKey: bansRoot(serverId) },
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            bans: p.bans.filter((b) => b.user.id !== userId),
          })),
        },
    );
  };
}
