import { ErrorCode, type CurrentUser } from '@nezfocus/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountRepository } from '../../../data/account';
import { asApiError } from '../../../domain/auth/authFlow';
import {
  changeAvatar,
  saveProfile,
  type AvatarFile,
  type ProfileForm,
} from '../../../domain/account/profile';
import { useGuardedMutation } from '../../../shared/hooks/useGuardedMutation';
import { showErrorToast } from '../../auth/hooks/useAuthActions';
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

// S-ME-01 "Lưu": the name and bio. The other devices get USER_UPDATE.
export function useSaveProfile() {
  const qc = useQueryClient();
  return useGuardedMutation(async (form: ProfileForm) => {
    try {
      qc.setQueryData(ME, await saveProfile(accountRepository, form));
      return { ok: true as const };
    } catch (err) {
      const api = asApiError(err);
      if (api?.code === ErrorCode.ValidationError && api.errors?.display_name)
        return { ok: false as const, error: 'name-empty' as const };
      return { ok: false as const, error: api ? 'other' : 'network' } as const;
    }
  });
}

// AUTH-06 AC1: the cropped photo is uploaded and set right away (the form's text is not).
export function useChangeAvatar() {
  const qc = useQueryClient();
  return useGuardedMutation(async (file: AvatarFile) => {
    const result = await changeAvatar(accountRepository, file);
    if (result.ok) qc.setQueryData(ME, result.user);
    return result;
  });
}

export function useRemoveAvatar() {
  const qc = useQueryClient();
  return useGuardedMutation(async () => {
    try {
      qc.setQueryData(
        ME,
        await accountRepository.updateProfile({ avatar_attachment_id: null }),
      );
      return true;
    } catch (err) {
      showErrorToast(asApiError(err) ? 'other' : 'network');
      return false;
    }
  });
}
