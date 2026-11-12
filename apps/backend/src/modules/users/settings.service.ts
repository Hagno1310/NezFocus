import { Injectable } from '@nestjs/common';
import {
  ErrorCode,
  type UpdateSettingsRequest,
  type UserSettings,
} from '@nezfocus/shared';
import { AppError, rateLimited } from '../../common/app-error.js';
import { Clock } from '../../common/clock.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { PresenceSink } from '../gateway/presence.service.js';
import { StreakService } from '../study/streak.service.js';
import { SettingsRepository } from './settings.repository.js';
import { acceptsDmVia } from './settings.rules.js';

// SRS 5.3 PATCH /users/@me/settings (CR-28): theme, language, time zone, privacy,
// notifications. Every change reaches the user's sessions as USER_SETTINGS_UPDATE.
@Injectable()
export class SettingsService {
  constructor(
    private readonly repo: SettingsRepository,
    private readonly events: EventPublisher,
    private readonly presence: PresenceSink,
    private readonly streak: StreakService,
    private readonly clock: Clock,
  ) {}

  get(userId: bigint): Promise<UserSettings> {
    return this.repo.read(userId);
  }

  async update(
    userId: bigint,
    body: UpdateSettingsRequest,
  ): Promise<UserSettings> {
    const { timezone, server_allow_dm, ...rest } = body;
    if (server_allow_dm) await this.checkMember(userId, server_allow_dm);
    const now = this.clock.now();
    const result = await this.repo.apply(
      userId,
      {
        columns: {
          theme: rest.theme,
          locale: rest.locale,
          allowDmFromServerMembers: rest.allow_dm_from_server_members,
          showStudyActivity: rest.show_study_activity,
          hidePushContent: rest.hide_push_content,
          focusSoundAlways: rest.focus_sound_always,
        },
        timezone,
        serverAllowDm: server_allow_dm,
      },
      now,
    );
    // STUDY-03 AC4; retry_after lets the app say when (S-ME-06 `timezone-rate-limited`).
    if (!result.ok)
      throw rateLimited((result.lockedUntil.getTime() - now.getTime()) / 1000);
    const { before, after } = result;
    await this.events.toUser(userId, 'USER_SETTINGS_UPDATE', after);
    // AUTH-05 (CR-24): presence sends PRESENCE_UPDATE with / without the activity.
    if (before.show_study_activity !== after.show_study_activity)
      await this.presence.settingsChanged(userId);
    // STUDY-03: minutes keep their old local day; "today" moves with the new zone.
    if (result.timezoneChanged) await this.streak.announce(userId);
    return after;
  }

  // REQ-DM-02, for DmAccessPolicy (P2-B3.2 #115): does `userId` take DMs from a non-friend
  // they share `sharedServerIds` with?
  async acceptsDmFromServerMembers(userId: bigint, sharedServerIds: bigint[]) {
    const s = await this.repo.read(userId);
    return acceptsDmVia(
      { allow: s.allow_dm_from_server_members, overrides: s.server_allow_dm },
      sharedServerIds.map(String),
    );
  }

  private async checkMember(
    userId: bigint,
    overrides: Record<string, boolean>,
  ) {
    const ids = Object.keys(overrides).map(BigInt);
    const mine = new Set(
      (await this.repo.memberServerIds(userId, ids)).map(String),
    );
    const notMine = ids.map(String).filter((id) => !mine.has(id));
    if (notMine.length)
      throw new AppError(ErrorCode.ValidationError, 'Invalid request', {
        server_allow_dm: notMine.map((id) => ({
          code: 'NOT_A_MEMBER',
          message: `Not a member of server ${id}`,
        })),
      });
  }
}
