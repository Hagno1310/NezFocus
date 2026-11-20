import { ErrorCode, type CurrentUser } from '@nezfocus/shared';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { accountRepository } from '../../../data/account';
import { localKv } from '../../../data/db/kv';
import { asApiError } from '../../../domain/auth/authFlow';
import { attachmentRepository } from '../../../data/attachments';
import type { ImageFile } from '../../../domain/attachments/AttachmentRepository';
import {
  changeAvatar,
  saveProfile,
  type ProfileForm,
} from '../../../domain/account/profile';
import { useGuardedMutation } from '../../../shared/hooks/useGuardedMutation';
import { showErrorToast } from '../../auth/hooks/useAuthActions';
import { useGatewayEvent } from '../../gateway/hooks/useGatewayEvent';

const ME = ['account', 'me'];
const KV_KEY = 'me';

// Also on the device (kv), so an offline cold start still shows my name and photo.
const setMe = (qc: QueryClient, user: CurrentUser) => {
  qc.setQueryData(ME, user);
  void localKv.set(KV_KEY, user).catch(() => {});
};

async function fetchMe() {
  const saved = await localKv.get<CurrentUser>(KV_KEY).catch(() => null);
  try {
    const user = await accountRepository.me();
    void localKv.set(KV_KEY, user).catch(() => {});
    return user;
  } catch (err) {
    if (saved) return saved;
    throw err;
  }
}

// My profile for Cá nhân. READY and USER_UPDATE keep it fresh (spec 07: no `loading`, the
// profile is cached from READY); the fetch covers a READY that came before this mounted.
export function useMe() {
  return useQuery({
    queryKey: ME,
    queryFn: fetchMe,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useMeSync() {
  const qc = useQueryClient();
  const set = (user: CurrentUser) => setMe(qc, user);
  useGatewayEvent('READY', (d) => set(d.user));
  useGatewayEvent('USER_UPDATE', set);
}

// S-ME-01 "Lưu": the name and bio. The other devices get USER_UPDATE.
export function useSaveProfile() {
  const qc = useQueryClient();
  return useGuardedMutation(async (form: ProfileForm) => {
    try {
      setMe(qc, await saveProfile(accountRepository, form));
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
  return useGuardedMutation(async (file: ImageFile) => {
    const result = await changeAvatar(
      accountRepository,
      attachmentRepository,
      file,
    );
    if (result.ok) setMe(qc, result.user);
    return result;
  });
}

export function useRemoveAvatar() {
  const qc = useQueryClient();
  return useGuardedMutation(async () => {
    try {
      setMe(
        qc,
        await accountRepository.updateProfile({ avatar_attachment_id: null }),
      );
      return true;
    } catch (err) {
      showErrorToast(asApiError(err) ? 'other' : 'network');
      return false;
    }
  });
}
