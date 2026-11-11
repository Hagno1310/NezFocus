import type { CurrentUser } from '@nezfocus/shared';
import type { AccountRepository } from '../../domain/account/AccountRepository';

// EXPO_PUBLIC_FAKE=account (WORKFLOW 4.2): An from spec 07 › Dữ liệu nhất quán.
export const FAKE_ME: CurrentUser = {
  id: '1',
  email: 'an.nguyen@gmail.com',
  username: 'an.nguyen',
  display_name: 'An',
  bio: 'Sinh viên năm 3 PTIT · đang ôn Giải tích 2',
  avatar: null,
  account_completed: true,
  created_at: '2026-10-01T08:00:00.000Z',
};

export function createFakeAccountRepository(delayMs = 300): AccountRepository {
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const me = { ...FAKE_ME };
  return {
    async me() {
      await wait();
      return { ...me };
    },
  };
}

export const fakeAccountRepository = createFakeAccountRepository();
