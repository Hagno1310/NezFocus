import { Global, Module } from '@nestjs/common';
import { Clock } from '../../common/clock.js';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { EventPublisher } from '../gateway/event-publisher.js';
import {
  DbNotificationService,
  NotificationService,
} from './notification-service.js';
import { NotificationsRepository } from './notifications.repository.js';

// WORKFLOW 4.3: other modules inject NotificationService.
@Global()
@Module({
  providers: [
    NotificationsRepository,
    {
      provide: NotificationService,
      inject: [
        NotificationsRepository,
        EventPublisher,
        SnowflakeGenerator,
        Clock,
      ],
      useFactory: (
        repo: NotificationsRepository,
        events: EventPublisher,
        ids: SnowflakeGenerator,
        clock: Clock,
      ) => new DbNotificationService(repo, events, ids, clock),
    },
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
