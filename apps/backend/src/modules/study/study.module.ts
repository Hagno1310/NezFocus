import { Global, Module } from '@nestjs/common';
import { ServersModule } from '../servers/servers.module.js';
import { BullRoomScheduler, RoomPhaseWorker } from './room-phase.queue.js';
import { RoomSessionController } from './room-session.controller.js';
import { RoomSessionListener } from './room-session.listener.js';
import { RoomSessionRepository } from './room-session.repository.js';
import { RoomScheduler, RoomSessionService } from './room-session.service.js';
import { BullSoloScheduler, SoloPhaseWorker } from './solo-phase.queue.js';
import { SoloSessionController } from './solo-session.controller.js';
import { SoloSessionRepository } from './solo-session.repository.js';
import { SoloScheduler, SoloSessionService } from './solo-session.service.js';
import { StreakService } from './streak.service.js';
import { StudyStatsController } from './study-stats.controller.js';
import { StudyStatsRepository } from './study-stats.repository.js';
import { StudyStatsService } from './study-stats.service.js';
import { LiveStudyRoomQuery, StudyRoomQuery } from './study-room.query.js';

// Global: the Gateway reads Room Sessions for READY (CR-28 #38), the kick / leave / logout dialogs read StudyRoomQuery.
@Global()
@Module({
  imports: [ServersModule],
  controllers: [
    SoloSessionController,
    StudyStatsController,
    RoomSessionController,
  ],
  providers: [
    StudyStatsRepository,
    StreakService,
    StudyStatsService,
    SoloSessionRepository,
    SoloSessionService,
    { provide: SoloScheduler, useClass: BullSoloScheduler },
    SoloPhaseWorker,
    { provide: StudyRoomQuery, useClass: LiveStudyRoomQuery },
    RoomSessionRepository,
    RoomSessionService,
    { provide: RoomScheduler, useClass: BullRoomScheduler },
    RoomPhaseWorker,
    RoomSessionListener,
  ],
  exports: [
    StudyStatsRepository,
    SoloSessionService,
    StreakService,
    StudyRoomQuery,
    RoomSessionService,
  ],
})
export class StudyModule {}
