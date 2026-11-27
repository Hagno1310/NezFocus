import { Module } from '@nestjs/common';
import { BullSoloScheduler, SoloPhaseWorker } from './solo-phase.queue.js';
import { SoloSessionController } from './solo-session.controller.js';
import { SoloSessionRepository } from './solo-session.repository.js';
import { SoloScheduler, SoloSessionService } from './solo-session.service.js';
import { StreakService } from './streak.service.js';
import { StudyStatsController } from './study-stats.controller.js';
import { StudyStatsRepository } from './study-stats.repository.js';
import { StudyStatsService } from './study-stats.service.js';
import { NoStudyRoomQuery, StudyRoomQuery } from './study-room.query.js';

@Module({
  controllers: [SoloSessionController, StudyStatsController],
  providers: [
    StudyStatsRepository,
    StreakService,
    StudyStatsService,
    SoloSessionRepository,
    SoloSessionService,
    { provide: SoloScheduler, useClass: BullSoloScheduler },
    SoloPhaseWorker,
    { provide: StudyRoomQuery, useClass: NoStudyRoomQuery },
  ],
  exports: [
    StudyStatsRepository,
    SoloSessionService,
    StreakService,
    StudyRoomQuery,
  ],
})
export class StudyModule {}
