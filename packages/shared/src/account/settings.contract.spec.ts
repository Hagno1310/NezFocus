import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USER_SETTINGS,
  UpdateSettingsRequest,
  UserSettings,
} from './settings.contract.js';

describe('settings contract (SRS 8.2 user_settings)', () => {
  it('the defaults are valid settings', () => {
    expect(UserSettings.parse(DEFAULT_USER_SETTINGS)).toEqual(
      DEFAULT_USER_SETTINGS,
    );
  });

  it('a partial update passes; an empty one does not', () => {
    expect(UpdateSettingsRequest.safeParse({ theme: 'dark' }).success).toBe(
      true,
    );
    expect(UpdateSettingsRequest.safeParse({}).success).toBe(false);
  });

  it.each([
    { theme: 'blue' },
    { locale: 'fr' },
    { timezone: 'Mars/Olympus' },
    { show_on_leaderboard: false }, // v1.x, not taken in MVP
    { timezone_changed_at: new Date().toISOString() }, // set by the backend only
    { server_allow_dm: { abc: false } },
  ])('rejects %o', (body) => {
    expect(UpdateSettingsRequest.safeParse(body).success).toBe(false);
  });

  it('per-server overrides are keyed by server id', () => {
    expect(
      UpdateSettingsRequest.safeParse({
        server_allow_dm: { '1234567890123456789': false },
      }).success,
    ).toBe(true);
  });
});
