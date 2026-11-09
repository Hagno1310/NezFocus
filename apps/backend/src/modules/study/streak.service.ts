import { Injectable } from '@nestjs/common';
import { toFocusedMinutes, type StreakState } from '@nezfocus/shared';
import { Clock } from '../../common/clock.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import { visibleStreak } from './streak.js';
import { StudyStatsRepository } from './study-stats.repository.js';

// REQ-STUDY-03: the streak and today's progress as the user sees them now.
@Injectable()
export class StreakService {
  constructor(
    private readonly stats: StudyStatsRepository,
    private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async state(userId: bigint) {
    const s = await this.stats.streakSnapshot(userId, this.clock.now());
    const streak: StreakState = {
      current_streak_days: visibleStreak(s.stored, s.today),
      longest_streak_days: s.stored.longest,
      today_minutes: toFocusedMinutes(s.todaySeconds),
    };
    return { streak, timezone: s.timezone, today: s.today };
  }

  // After every credit, and from P1-A5.1 (#76) after a time zone change: "today" moves, so both numbers may.
  async announce(userId: bigint) {
    const { streak } = await this.state(userId);
    await this.events.toUser(userId, 'STREAK_UPDATE', streak);
  }
}
