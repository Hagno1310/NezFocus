import type {
  AccountDeletionPreview,
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
  // REQ-AUTH-10 (CR-28 #41): the servers blocking a deletion and the ones going with it.
  deletionPreview(): Promise<AccountDeletionPreview>;
  // 204 → every session ends (this one too) · 40010, 40102, 40029.
  deleteAccount(password: string): Promise<void>;
  // AC4 "Khôi phục tài khoản".
  cancelDeletion(): Promise<void>;
}
