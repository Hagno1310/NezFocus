import type {
  CompleteAccountRequest,
  CurrentUser,
  EmailCodeSentResponse,
  EmailSignInResponse,
  SessionResponse,
} from '@nezfocus/shared';

// Implementations keep the returned tokens themselves; callers update sessionStore from the user.
// Errors are ApiError (data/api) with SRS 11.1 codes, from the Fake too.
export interface AuthRepository {
  sendEmailCode(email: string): Promise<EmailCodeSentResponse>;
  verifyEmailCode(email: string, code: string): Promise<EmailSignInResponse>;
  login(email: string, password: string): Promise<SessionResponse>;
  usernameAvailable(username: string): Promise<boolean>;
  completeAccount(body: CompleteAccountRequest): Promise<CurrentUser>;
  logout(): Promise<void>;
}
