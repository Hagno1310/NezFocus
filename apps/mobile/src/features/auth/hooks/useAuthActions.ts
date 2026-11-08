import type { CompleteAccountRequest } from '@nezfocus/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LogIn, Mail } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { authRepository } from '../../../data/auth';
import { checkEmail, type SignInMode } from '../../../domain/auth/authFlow';
import {
  finishAccount,
  logIn,
  requestCode,
  usernameStatus,
  verifyCode,
} from '../../../domain/auth/signIn';
import { signIn, signOut } from '../../../domain/session/sessionStore';
import { i18n } from '../../../shared/i18n';
import { showToast } from '../../../shared/ui/Toast';
import { rememberMethod, useAuthFlow } from '../authFlowStore';

// A mutation whose `run` ignores taps while one is in flight. The ref blocks a second tap
// that lands before React re-renders the button as loading (spec 01 › Chỉ ghi luật).
function useGuardedMutation<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
) {
  const mutation = useMutation({ mutationFn: (args: A) => fn(...args) });
  const running = useRef(false);
  const { mutateAsync } = mutation;
  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      if (running.current) return undefined;
      running.current = true;
      try {
        return await mutateAsync(args);
      } finally {
        running.current = false;
      }
    },
    [mutateAsync],
  );
  return { run, pending: mutation.isPending };
}

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
  useAuthFlow.setState({ sentCode: null, suggestedUsername });
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

export function useSendCode() {
  return useGuardedMutation(async (email: string, force?: boolean) => {
    const { result, sent } = await requestCode(
      authRepository,
      useAuthFlow.getState().sentCode,
      email,
      Date.now,
      { force },
    );
    useAuthFlow.setState({ sentCode: sent });
    return result;
  });
}

// "Tiếp tục" (S-AUTH-02) and "Gửi mã OTP" (S-AUTH-04): check the email, send (or reuse)
// the code, then open S-AUTH-03. The screens only differ in how they show the errors.
export function useEmailCodeStep(on: {
  sent: (email: string) => void;
  fieldError: (error: 'empty' | 'invalid') => void;
  rateLimited: () => void;
}) {
  const send = useSendCode();
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
      else if (result.error.kind === 'rate-limited') on.rateLimited();
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
