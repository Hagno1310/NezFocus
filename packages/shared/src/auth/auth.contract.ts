import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';
import {
  checkPassword,
  checkUsername,
  normalizeUsername,
} from './credentials.js';

// Paths are relative to /api/v1 (SRS 5.2, 5.3 Auth).
export const AuthRoutes = {
  // REQ-AUTH-01/13 · public · 40001, 40029. Same response whether the email has an account or not.
  sendEmailCode: '/auth/email-code',
  // REQ-AUTH-01/02/13 · public, needs X-Client-Platform · 40001, 40002, 40003 (attempts_left)
  verifyEmailCode: '/auth/email-code/verify',
  // REQ-AUTH-01 · bearer, incomplete account allowed · 40001, 40029. A hint only: complete-account checks again.
  usernameAvailable: '/auth/username-available',
  // REQ-AUTH-01 · bearer, incomplete account allowed · 40001, 40901 (username taken), 40100
  completeAccount: '/auth/complete-account',
  // REQ-AUTH-02 · public, needs X-Client-Platform · 40001, 40102, 40029 (Retry-After)
  login: '/auth/login',
  // REQ-AUTH-04 · public · 40100 (+ reason), 40103 (reason: reuse_detected)
  refresh: '/auth/refresh',
  // REQ-AUTH-07 (P1) · bearer · 204
  logout: '/auth/logout',
} as const;

// Bump when the Terms / Privacy Policy text changes; the app sends the version it showed.
export const TERMS_VERSION = '2026-11-05';

// REQ-AUTH-06: display names are 1–32 characters.
export const DISPLAY_NAME_MAX = 32;

export const EMAIL_CODE_TTL_SECONDS = 15 * 60;
export const EMAIL_CODE_RESEND_SECONDS = 60;

// Field errors carry rule codes from credentials.ts in `params.code`.
const ruleIssue = (code: string) => ({
  code: 'custom' as const,
  message: code,
  params: { code },
});

export const Email = z.string().trim().toLowerCase().pipe(z.email().max(255));

export const Username = z
  .string()
  .transform(normalizeUsername)
  .superRefine((value, ctx) => {
    for (const code of checkUsername(value)) ctx.addIssue(ruleIssue(code));
  });

// Rules that need the username or email (SAME_AS_PERSONAL_INFO) are checked by the backend.
export const Password = z.string().superRefine((value, ctx) => {
  for (const code of checkPassword(value)) ctx.addIssue(ruleIssue(code));
});

// SRS 5.2 client header. Sign-in endpoints record it on the session; missing → 40001.
export const CLIENT_PLATFORM_HEADER = 'X-Client-Platform';
export const ClientPlatform = z.enum(['ios', 'android']);
export type ClientPlatform = z.infer<typeof ClientPlatform>;

// CR-28 #10: generated once per install, kept in secure storage.
export const DeviceInfo = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(100).optional(),
});
export type DeviceInfo = z.infer<typeof DeviceInfo>;

// CR-28 #11: why a session ended; also the Gateway's `revoke_reason` with close code 4004.
export const SessionEndReason = z.enum([
  'password_reset',
  'revoked',
  'reuse_detected',
]);
export type SessionEndReason = z.infer<typeof SessionEndReason>;

// The signed-in user's own account. Other people's profiles get their own schema.
export const CurrentUser = z.object({
  id: SnowflakeId,
  email: z.string(),
  username: z.string().nullable(), // null until the account is completed
  display_name: z.string().nullable(),
  account_completed: z.boolean(), // false → open Complete account (40309 elsewhere)
  created_at: z.iso.datetime(),
});
export type CurrentUser = z.infer<typeof CurrentUser>;

export const TokenPairResponse = z.object({
  access_token: z.string(), // JWT, 15 minutes
  refresh_token: z.string(), // 30 days, single use
  expires_in: z.number().int(), // seconds until access_token expires
});
export type TokenPairResponse = z.infer<typeof TokenPairResponse>;

export const SessionResponse = TokenPairResponse.extend({
  session_id: SnowflakeId,
  user: CurrentUser,
});
export type SessionResponse = z.infer<typeof SessionResponse>;

// POST /auth/email-code
export const SendEmailCodeRequest = z.object({
  email: Email,
  device: DeviceInfo,
});
export type SendEmailCodeRequest = z.infer<typeof SendEmailCodeRequest>;

export const EmailCodeSentResponse = z.object({
  expires_in: z.number().int(), // seconds the code stays valid
  resend_in: z.number().int(), // seconds before "Gửi lại mã" is allowed
});
export type EmailCodeSentResponse = z.infer<typeof EmailCodeSentResponse>;

// POST /auth/email-code/verify
export const VerifyEmailCodeRequest = z.object({
  email: Email,
  code: z.string().regex(/^\d{6}$/),
  device: DeviceInfo,
});
export type VerifyEmailCodeRequest = z.infer<typeof VerifyEmailCodeRequest>;

export const EmailSignInResponse = SessionResponse.extend({
  // Prefill for Complete account; null once completed or when the email gives nothing usable.
  suggested_username: z.string().nullable(),
});
export type EmailSignInResponse = z.infer<typeof EmailSignInResponse>;

// GET /auth/username-available?username=
export const CheckUsernameRequest = z.object({ username: Username });
export type CheckUsernameRequest = z.infer<typeof CheckUsernameRequest>;

export const UsernameAvailableResponse = z.object({ available: z.boolean() });
export type UsernameAvailableResponse = z.infer<
  typeof UsernameAvailableResponse
>;

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// POST /auth/complete-account → CurrentUser
export const CompleteAccountRequest = z.object({
  display_name: z.string().trim().min(1).max(DISPLAY_NAME_MAX),
  username: Username,
  password: Password,
  timezone: z.string().max(64).refine(isTimeZone, 'invalid IANA time zone'),
  locale: z.enum(['vi', 'en']),
  age_confirmed: z.literal(true), // DEC-18
  terms_accepted: z.literal(true),
  terms_version: z.literal(TERMS_VERSION),
});
export type CompleteAccountRequest = z.infer<typeof CompleteAccountRequest>;

// POST /auth/login → SessionResponse
export const LoginRequest = z.object({
  email: Email,
  password: z.string().min(1).max(512), // bounds hashing cost; rules live in Password
  device: DeviceInfo,
});
export type LoginRequest = z.infer<typeof LoginRequest>;

// POST /auth/refresh → TokenPairResponse
export const RefreshTokenRequest = z.object({
  refresh_token: z.string().min(1).max(512),
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequest>;
