import { z } from 'zod';
import { IanaTimeZone, Locale } from '../auth/auth.contract.js';
import { SnowflakeId } from '../snowflake.js';

export const SettingsRoutes = {
  // SRS 5.3 · bearer · PATCH UpdateSettingsRequest → UserSettings · 40001 (field errors; a
  // server_allow_dm key of a server you are not in), 40029 + retry_after (second time zone
  // change within 24 hours, STUDY-03 AC4). Sends USER_SETTINGS_UPDATE to the user's sessions.
  settings: '/users/@me/settings',
} as const;

// SRS 3.3: "Theo hệ thống" follows the phone's Appearance.
export const ThemePreference = z.enum(['system', 'dark', 'light']);
export type ThemePreference = z.infer<typeof ThemePreference>;

// SRS 8.2 user_settings (MVP columns) + user_server_settings.allow_dm. Sent in READY and
// USER_SETTINGS_UPDATE, returned by PATCH /users/@me/settings.
export const UserSettings = z.object({
  theme: ThemePreference,
  locale: Locale,
  timezone: IanaTimeZone,
  // REQ-STUDY-03: last change in Cài đặt (Complete account leaves it null); +24 h = next allowed.
  timezone_changed_at: z.iso.datetime().nullable(),
  allow_dm_from_server_members: z.boolean(), // REQ-DM-02
  // REQ-DM-02 overrides per server id; a server missing here follows the switch above.
  server_allow_dm: z.record(SnowflakeId, z.boolean()),
  show_study_activity: z.boolean(), // REQ-AUTH-05, CR-24
  hide_push_content: z.boolean(), // REQ-NOTIF-02
  focus_sound_always: z.boolean(), // SRS 3.3, foreground only (CR-28 #22)
});
export type UserSettings = z.infer<typeof UserSettings>;

// The column defaults of SRS 8.2, for an account the app has no settings of yet.
export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'system',
  locale: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  timezone_changed_at: null,
  allow_dm_from_server_members: true,
  server_allow_dm: {},
  show_study_activity: true,
  hide_push_content: false,
  focus_sound_always: false,
};

// PATCH /users/@me/settings: send only what changes. Strict, so the v1.x fields
// (show_on_leaderboard, share_study_stats, analytics_opt_out, study_mode_schedule) are 40001.
export const UpdateSettingsRequest = UserSettings.omit({
  timezone_changed_at: true,
})
  .partial()
  .strict()
  .refine((b) => Object.values(b).some((v) => v !== undefined), {
    message: 'Nothing to change',
  });
export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsRequest>;
