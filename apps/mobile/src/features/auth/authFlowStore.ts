import { Mail, LogIn } from 'lucide-react-native';
import { create } from 'zustand';
import { authPrefs } from '../../data/auth/authPrefs';
import { authRepository } from '../../data/auth';
import {
  canReuseCode,
  sendCodeErrorState,
  type SendCodeErrorState,
  type SentCode,
  type SignInMode,
} from '../../domain/auth/authFlow';
import { signIn } from '../../domain/session/sessionStore';
import { i18n } from '../../shared/i18n';
import { showToast } from '../../shared/ui/Toast';

// Spec 01 flow state that outlives one screen. Not persisted except the sign-in way:
// a killed app reopens on S-AUTH-01 (AUTH-13, spec › S-AUTH-03 Tương tác).
type AuthFlowState = {
  sentCode: SentCode | null;
  lastMethod: SignInMode | null;
};

export const useAuthFlow = create<AuthFlowState>(() => ({
  sentCode: null,
  lastMethod: null,
}));

export const loadLastMethod = async () => {
  const lastMethod = await authPrefs.lastMethod().catch(() => null);
  useAuthFlow.setState({ lastMethod });
};

const rememberMethod = (lastMethod: SignInMode) => {
  useAuthFlow.setState({ lastMethod });
  void authPrefs.setLastMethod(lastMethod).catch(() => {});
};

export type SendCodeResult =
  { ok: true; reused: boolean } | { ok: false; error: SendCodeErrorState };

// S-AUTH-02 › Tương tác: the same email again before the minute is up reuses the code.
export async function sendCode(
  email: string,
  { force = false } = {},
): Promise<SendCodeResult> {
  const { sentCode } = useAuthFlow.getState();
  if (!force && canReuseCode(sentCode, email, Date.now()))
    return { ok: true, reused: true };
  try {
    const { resend_in } = await authRepository.sendEmailCode(email);
    useAuthFlow.setState({
      sentCode: { email, resendAt: Date.now() + resend_in * 1000 },
    });
    return { ok: true, reused: false };
  } catch (err) {
    const error = sendCodeErrorState(err);
    if (error.kind === 'wait')
      useAuthFlow.setState({
        sentCode: { email, resendAt: Date.now() + error.seconds * 1000 },
      });
    return { ok: false, error };
  }
}

export const showResentToast = (email: string) =>
  showToast({
    icon: Mail,
    message: i18n.t('auth.enterCode.resent', { email }),
  });

// Spec 01 › Điều hướng sau khi vào được tài khoản: the root navigator swaps stacks on status
// (incomplete → S-ONB-01, else Main or the screen before the session ended).
export function finishSignIn(
  user: { id: string; email: string; account_completed: boolean },
  method: SignInMode,
  { fromCreateAccount = false } = {},
) {
  rememberMethod(method);
  useAuthFlow.setState({ sentCode: null });
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
