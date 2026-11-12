import type { CompleteAccountRequest } from '@nezfocus/shared';
import { useQuery } from '@tanstack/react-query';
import { LogIn, Mail } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { authRepository } from '../../../data/auth';
import { checkEmail, type SignInMode } from '../../../domain/auth/authFlow';
import {
  finishAccount,
  logIn,
  requestCode,
  usernameStatus,
  verifyCode,
  type CodePurpose,
} from '../../../domain/auth/signIn';
import {
  resetPassword,
  type ResetForm,
} from '../../../domain/auth/resetPassword';
import { signIn, signOut } from '../../../domain/session/sessionStore';
import { i18n } from '../../../shared/i18n';
import { useGuardedMutation } from '../../../shared/hooks/useGuardedMutation';
import { showToast } from '../../../shared/ui/Toast';
import { rememberMethod, useAuthFlow } from '../authFlowStore';

// SRS 3.4 generic toasts, for errors a screen has no sentence of its own for.
export const showErrorToast = (kind: 'network' | 'other') =>
  showToast({ message: i18n.t(`auth.errors.${kind}`) });

// Spec 01 › Điều hướng sau khi vào được tài khoản: the root navigator swaps stacks on status
// (incomplete → S-ONB-01, else Main or the screen before the session ended).
function startSession(
  user: { id: string; email: string; account_completed: boolean },
  method: SignInMode,
  { fromCreateAccount = false, suggestedUsername = null as string | null } = {},
) {
  rememberMethod(method);
  useAuthFlow.setState({ sentCode: null, resetCode: null, suggestedUsername });
  signIn(
    { id: user.id, email: user.email },
    { completed: user.account_completed },
  );
  // AUTH-01 AC2b: an existing account reached from "Tạo tài khoản".
  if (fromCreateAccount && user.account_completed)
    showToast({
      icon: LogIn,
      message: i18n.t('auth.enterCode.existingAccount'),
    });
}

// Each purpose waits on its own code (AUTH-02 AC7): S-AUTH-03 and S-AUTH-05 count down apart.
const codeSlot = { sign_in: 'sentCode', reset_password: 'resetCode' } as const;

export function useSendCode(purpose: CodePurpose = 'sign_in') {
  return useGuardedMutation(async (email: string, force?: boolean) => {
    const slot = codeSlot[purpose];
    const { result, sent } = await requestCode(
      authRepository,
      useAuthFlow.getState()[slot],
      email,
      Date.now,
      { force, purpose },
    );
    useAuthFlow.setState({ [slot]: sent });
    return result;
  });
}

// "Tiếp tục" (S-AUTH-02), "Gửi mã OTP" (S-AUTH-04, S-AUTH-05 request): check the email,
// send (or reuse) the code, then open the code screen. The screens only differ in how they
// show the errors.
export function useEmailCodeStep(
  on: {
    sent: (email: string) => void;
    fieldError: (error: 'empty' | 'invalid') => void;
    rateLimited: (retryAfter: number | null) => void;
  },
  purpose: CodePurpose = 'sign_in',
) {
  const send = useSendCode(purpose);
  const { run } = send;
  const start = useCallback(
    async (raw: string) => {
      const checked = checkEmail(raw);
      if ('error' in checked) {
        on.fieldError(checked.error);
        Keyboard.dismiss();
        return;
      }
      const result = await run(checked.email);
      if (!result) return;
      if (result.ok || result.error.kind === 'wait') on.sent(checked.email);
      else if (result.error.kind === 'invalid-email') on.fieldError('invalid');
      else if (result.error.kind === 'rate-limited')
        on.rateLimited(result.error.retryAfter);
      else showErrorToast(result.error.kind);
    },
    [run, on],
  );
  return { start, pending: send.pending };
}

export const showResentToast = (email: string) =>
  showToast({
    icon: Mail,
    message: i18n.t('auth.enterCode.resent', { email }),
  });

export function useVerifyCode(email: string, from: 'create' | 'signIn') {
  return useGuardedMutation(async (code: string) => {
    const result = await verifyCode(authRepository, email, code);
    if (result.ok)
      startSession(result.session.user, 'otp', {
        fromCreateAccount: from === 'create',
        suggestedUsername: result.session.suggested_username,
      });
    return result;
  });
}

export function useLogIn() {
  return useGuardedMutation(async (email: string, password: string) => {
    const result = await logIn(authRepository, email, password, Date.now);
    if (result.ok) startSession(result.session.user, 'password');
    return result;
  });
}

// AUTH-08 AC4: signed in here (password remembered as the way in), the others signed out.
export function useResetPassword() {
  return useGuardedMutation(async (form: ResetForm) => {
    const result = await resetPassword(authRepository, form);
    if (result.ok) {
      startSession(result.session.user, 'password');
      showToast({ message: i18n.t('auth.forgot.done') });
    }
    return result;
  });
}

export function useFinishAccount(current: { id: string; email: string }) {
  return useGuardedMutation(async (body: CompleteAccountRequest) => {
    const result = await finishAccount(authRepository, body);
    if (result.ok) {
      useAuthFlow.setState({ suggestedUsername: null });
      signIn(result.user ?? current, { completed: true });
    }
    return result;
  });
}

// S-ONB-01 "Đăng xuất": no confirmation; the account stays incomplete for next time.
export function useLogOut() {
  return useGuardedMutation(async () => {
    await authRepository.logout().catch(() => {});
    signOut();
  });
}

const PAUSE_MS = 500;

// S-ONB-01 › Tương tác: ask whether the username is free 0.5 s after typing stops (the
// prefilled one right away). Only a hint: complete-account checks again (40901).
export function useUsernameStatus(username: string) {
  const [asked, setAsked] = useState(username);
  useEffect(() => {
    if (asked === username) return;
    const timer = setTimeout(() => setAsked(username), PAUSE_MS);
    return () => clearTimeout(timer);
  }, [asked, username]);
  const query = useQuery({
    queryKey: ['auth', 'username-available', asked],
    queryFn: () => usernameStatus(authRepository, asked),
    retry: false,
  });
  if (asked !== username) return 'idle'; // still typing
  return query.isPending ? 'checking' : (query.data ?? 'idle');
}
