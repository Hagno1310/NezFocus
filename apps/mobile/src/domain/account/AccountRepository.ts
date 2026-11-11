import type { CurrentUser } from '@nezfocus/shared';

// Cá nhân (spec 07), SRS 5.3 Account. Errors: ApiError with SRS 11.1 codes.
export interface AccountRepository {
  me(): Promise<CurrentUser>;
}
