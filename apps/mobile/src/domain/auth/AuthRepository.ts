import type {
  CompleteAccountRequest,
  CurrentUser,
  EmailCodeSentResponse,
  EmailSignInResponse,
  SessionResponse,
} from '@nezfocus/shared';

// Implementations store the tokens; callers update sessionStore. Errors: ApiError with SRS 11.1 codes.
export interface AuthRepository {
  sendEmailCode(email: string): Promise<EmailCodeSentResponse>;
  verifyEmailCode(email: string, code: string): Promise<EmailSignInResponse>;
  login(email: string, password: string): Promise<SessionResponse>;
  usernameAvailable(username: string): Promise<boolean>;
  completeAccount(body: CompleteAccountRequest): Promise<CurrentUser>;
  logout(): Promise<void>;
}
