import { ErrorCode } from '@nezfocus/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountRepository } from '../../../data/account';
import { asApiError } from '../../../domain/auth/authFlow';
import {
  changePassword,
  type ChangePasswordForm,
} from '../../../domain/account/changePassword';
import { useGuardedMutation } from '../../../shared/hooks/useGuardedMutation';
import { showErrorToast } from '../../auth/hooks/useAuthActions';

const SESSIONS = ['account', 'sessions'];

// S-ME-03 `sessions` and the "N thiết bị" of the Tài khoản row (AUTH-07).
export function useSessions() {
  return useQuery({ queryKey: SESSIONS, queryFn: accountRepository.sessions });
}

// 40401 = that session already ended elsewhere: the refreshed list says enough.
function useSessionMutation<A extends unknown[]>(
  call: (...args: A) => Promise<void>,
) {
  const qc = useQueryClient();
  return useGuardedMutation(async (...args: A) => {
    try {
      await call(...args);
    } catch (err) {
      const api = asApiError(err);
      if (api?.code !== ErrorCode.NotFound)
        showErrorToast(api ? 'other' : 'network');
    }
    await qc.invalidateQueries({ queryKey: SESSIONS });
  });
}

export const useRevokeSession = () =>
  useSessionMutation((id: string) => accountRepository.revokeSession(id));

export const useRevokeOtherSessions = () =>
  useSessionMutation(() => accountRepository.revokeOtherSessions());

// AUTH-14 AC1 / AC5: this session stays, the others end; the list is fetched again.
export function useChangePassword(personal: {
  email: string;
  username: string | null;
}) {
  const qc = useQueryClient();
  return useGuardedMutation(async (form: ChangePasswordForm) => {
    const result = await changePassword(
      accountRepository,
      form,
      personal,
      Date.now,
    );
    if (result.ok) void qc.invalidateQueries({ queryKey: SESSIONS });
    return result;
  });
}
