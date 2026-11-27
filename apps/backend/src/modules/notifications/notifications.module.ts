import { Global, Module } from '@nestjs/common';
import {
  DbNotificationService,
  NotificationService,
} from './notification-service.js';
import { NotificationsRepository } from './notifications.repository.js';
import { LogPushService, PushService } from './push-service.js';

// WORKFLOW 4.3: other modules inject NotificationService and PushService.
@Global()
@Module({
  providers: [
    NotificationsRepository,
    { provide: NotificationService, useClass: DbNotificationService },
    { provide: PushService, useClass: LogPushService },
  ],
  exports: [NotificationService, PushService],
})
export class NotificationsModule {}
