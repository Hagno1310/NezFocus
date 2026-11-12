import { create } from 'zustand';
import { authPrefs } from '../../data/auth/authPrefs';
import type { SentCode, SignInMode } from '../../domain/auth/authFlow';

// Spec 01 flow state that outlives one screen. Only the sign-in way is persisted: a killed
// app reopens on S-AUTH-01 (AUTH-13, spec › S-AUTH-03 Tương tác).
type AuthFlowState = {
  sentCode: SentCode | null;
  resetCode: SentCode | null; // S-AUTH-05: its own code and countdown (AUTH-02 AC7)
  lastMethod: SignInMode | null; // AUTH-02 AC6
  suggestedUsername: string | null; // from the OTP sign-in, prefills S-ONB-01
};

export const useAuthFlow = create<AuthFlowState>(() => ({
  sentCode: null,
  resetCode: null,
  lastMethod: null,
  suggestedUsername: null,
}));

export const loadLastMethod = async () => {
  const lastMethod = await authPrefs.lastMethod().catch(() => null);
  useAuthFlow.setState({ lastMethod });
};

export const rememberMethod = (lastMethod: SignInMode) => {
  useAuthFlow.setState({ lastMethod });
  void authPrefs.setLastMethod(lastMethod).catch(() => {});
};
