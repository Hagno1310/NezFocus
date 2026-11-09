import { Module } from '@nestjs/common';
import { BullSoloScheduler, SoloPhaseWorker } from './solo-phase.queue.js';
import { SoloSessionController } from './solo-session.controller.js';
import { SoloSessionRepository } from './solo-session.repository.js';
import { SoloScheduler, SoloSessionService } from './solo-session.service.js';
import { StreakService } from './streak.service.js';
import { StudyStatsRepository } from './study-stats.repository.js';

@Module({
  controllers: [SoloSessionController],
  providers: [
    StudyStatsRepository,
    StreakService,
    SoloSessionRepository,
    SoloSessionService,
    { provide: SoloScheduler, useClass: BullSoloScheduler },
    SoloPhaseWorker,
  ],
  exports: [StudyStatsRepository, SoloSessionService, StreakService],
})
export class StudyModule {}
