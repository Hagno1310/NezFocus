import type {
  ChangePasswordRequest,
  CurrentUser,
  SessionInfo,
  UpdateProfileRequest,
} from '@nezfocus/shared';

// Cá nhân (spec 07), SRS 5.3 Account. Errors: ApiError with SRS 11.1 codes.
export interface AccountRepository {
  me(): Promise<CurrentUser>;
  // AUTH-14: keeps this session, ends the others.
  changePassword(body: ChangePasswordRequest): Promise<void>;
  // AUTH-07: live sessions, newest activity first.
  sessions(): Promise<SessionInfo[]>;
  revokeSession(id: string): Promise<void>;
  revokeOtherSessions(): Promise<void>;
  // AUTH-06: USER_UPDATE reaches the other devices.
  updateProfile(body: UpdateProfileRequest): Promise<CurrentUser>;
}
