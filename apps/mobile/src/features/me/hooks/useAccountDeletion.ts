import { ErrorCode } from '@nezfocus/shared';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { accountRepository } from '../../../data/account';
import { secureTokenStore } from '../../../data/auth/secureTokenStore';
import { onGatewayEvent } from '../../../domain/gateway/gatewayStore';
import {
  expectSessionEnd,
  signOut,
} from '../../../domain/session/sessionStore';
import { useAuthFlow } from '../../auth/authFlowStore';

const PREVIEW = ['account', 'deletion'] as const;

export type DeleteStep = 'blocked' | 'confirm' | null;

// "Xóa tài khoản": which sheet opens, from the backend's lists (CR-28 #41).
export async function firstDeleteStep(qc: QueryClient): Promise<DeleteStep> {
  const preview = await qc.fetchQuery({
    queryKey: PREVIEW,
    queryFn: accountRepository.deletionPreview,
    staleTime: 0,
  });
  return preview.owned_servers.length ? 'blocked' : 'confirm';
}

// REQ-AUTH-10: the lists of S-ME-03, kept fresh while the blocking sheet is open.
export function useDeletionPreview(step: DeleteStep) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: PREVIEW,
    queryFn: accountRepository.deletionPreview,
    enabled: step !== null,
  });
  // A transfer or a delete done on another device changes what blocks.
  useEffect(
    () =>
      onGatewayEvent((e) => {
        if (
          step === 'blocked' &&
          (e.t === 'SERVER_UPDATE' || e.t === 'SERVER_DELETE')
        )
          void qc.invalidateQueries({ queryKey: PREVIEW });
      }),
    [qc, step],
  );
  return {
    ...query,
    refresh: () => qc.invalidateQueries({ queryKey: PREVIEW }),
  };
}

// AC1: 'blocked' when a server gained a member meanwhile (40010); else signed out here
// with the Welcome notice instead of the 4004 banner of other devices.
export async function deleteAccount(
  password: string,
  deletesAt: string | null,
): Promise<'done' | 'blocked'> {
  useAuthFlow.setState({ deletionNotice: deletesAt });
  expectSessionEnd('account_deleted');
  try {
    await accountRepository.deleteAccount(password);
  } catch (err) {
    expectSessionEnd(null);
    useAuthFlow.setState({ deletionNotice: null });
    if ((err as { code?: number }).code === ErrorCode.OwnershipTransferRequired)
      return 'blocked';
    throw err;
  }
  expectSessionEnd(null);
  await secureTokenStore.clear().catch(() => {});
  signOut();
  return 'done';
}
