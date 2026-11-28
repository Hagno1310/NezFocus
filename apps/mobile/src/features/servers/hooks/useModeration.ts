import type { BanRequest, ServerMember } from '@nezfocus/shared';
import { useQueryClient } from '@tanstack/react-query';
import { serverRepository } from '../../../data/servers';
import { bansRoot } from './useServerLists';

const membersRoot = (serverId: string) => ['servers', serverId, 'members'];

type List = readonly ServerMember[];

// REQ-ROLE-05 from S-SET-03 / S-HOME-10: every member list of the server shows the result at
// once; SERVER_MEMBER_UPDATE / REMOVE bring the same to the other screens.
export function useModerate(serverId: string) {
  const qc = useQueryClient();
  const edit = (fn: (list: List) => List) =>
    qc.setQueriesData<List>({ queryKey: membersRoot(serverId) }, (list) =>
      list ? fn(list) : list,
    );
  const drop = (userId: string) =>
    edit((list) => list.filter((m) => m.user.id !== userId));
  return {
    timeout: async (
      userId: string,
      until: string | null,
      reason?: string | null,
    ) => {
      const next = await serverRepository.timeoutMember(
        serverId,
        userId,
        until,
        reason,
      );
      edit((list) => list.map((m) => (m.user.id === userId ? next : m)));
    },
    kick: async (userId: string, reason: string | null) => {
      await serverRepository.kickMember(serverId, userId, reason);
      drop(userId);
    },
    ban: async (userId: string, body: BanRequest) => {
      await serverRepository.banMember(serverId, userId, body);
      drop(userId);
      void qc.invalidateQueries({ queryKey: bansRoot(serverId) });
    },
  };
}
