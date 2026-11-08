import { z } from 'zod';

// SRS 11.1. Codes are never reused; the app maps `code` to its own vi/en strings.
export const ErrorCode = {
  ValidationError: 40001,
  TokenLinkInvalid: 40002,
  VerificationCodeInvalid: 40003,
  OwnershipTransferRequired: 40010,
  MaxServersReached: 40011,
  OwnerCannotLeave: 40012,
  FileTooLarge: 40013,
  UnsupportedFileType: 40014,
  PremiumRequired: 40015,
  InvalidTaskAssignee: 40016,
  InvalidTaskDueDate: 40017,
  MaxOpenTasksReached: 40018,
  FileBlocked: 40019,
  RateLimited: 40029,
  SlowModeRateLimited: 40030,
  InviteInvalid: 40041,
  VoiceChannelFull: 40051,
  GroupDMFull: 40052,
  MaxGroupDMsReached: 40053,
  TokenInvalid: 40100,
  InvalidMFACode: 40101,
  InvalidCredentials: 40102,
  RefreshTokenReused: 40103,
  MFARequired: 40104,
  CaptchaRequired: 40105,
  InsufficientRoleHierarchy: 40301,
  Forbidden: 40302,
  CannotMessageUser: 40303,
  BannedFromServer: 40306,
  MemberTimedOut: 40307,
  AccountSuspended: 40308,
  AccountIncomplete: 40309,
  NotFound: 40401,
  Conflict: 40901,
  FriendRequestAlreadyPending: 40902,
  FocusSessionAlreadyActive: 40903,
  MaxPinsReached: 40904,
  MaxReactionsReached: 40905,
  AccountLinkRequired: 40906,
  IdempotencyKeyReused: 40907,
  AlreadyFriends: 40908,
  ReportTargetChanged: 40909,
  AdminSubjectChanged: 40910,
  UpgradeRequired: 42601,
  InternalError: 50000,
  ServiceUnavailable: 50301,
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// SRS 5.2 error body.
export const ApiErrorBody = z.object({
  code: z.number(),
  message: z.string(),
  errors: z
    .record(
      z.string(),
      z.array(z.object({ code: z.string(), message: z.string() })),
    )
    .optional(),
  request_id: z.string().optional(),
  retry_after: z.number().nullable().optional(),
  attempts_left: z.number().int().optional(), // 40003
  // 40100 / 40103: why the session ended (SessionEndReason; admin web has its own values)
  reason: z.string().optional(),
  // 42601: the lowest app version the backend accepts (S-AUTH-00 shows it when present)
  min_version: z.string().optional(),
});

export type ApiErrorBody = z.infer<typeof ApiErrorBody>;
