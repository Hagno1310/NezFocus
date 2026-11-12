import type { UpdateSettingsRequest, UserSettings } from '@nezfocus/shared';

// SRS 5.3 PATCH /users/@me/settings. Errors: ApiError with SRS 11.1 codes (40001, 40029 +
// retry_after for a second time zone change in 24 hours).
export interface SettingsRepository {
  update(change: UpdateSettingsRequest): Promise<UserSettings>;
}
