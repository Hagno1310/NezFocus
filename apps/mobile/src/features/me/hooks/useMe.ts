import type { CurrentUser } from '@nezfocus/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountRepository } from '../../../data/account';
import { useGatewayEvent } from '../../gateway/hooks/useGatewayEvent';

const ME = ['account', 'me'];

// My profile for Cá nhân. READY and USER_UPDATE keep it fresh (spec 07: no `loading`, the
// profile is cached from READY); the fetch covers a READY that came before this mounted.
// ponytail: in memory only, so an offline cold start shows no name until online; persist the
// cache once op-sqlite lands (P2-A3.3 #101).
export function useMe() {
  return useQuery({
    queryKey: ME,
    queryFn: accountRepository.me,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useMeSync() {
  const qc = useQueryClient();
  const set = (user: CurrentUser) => qc.setQueryData(ME, user);
  useGatewayEvent('READY', (d) => set(d.user));
  useGatewayEvent('USER_UPDATE', set);
}
