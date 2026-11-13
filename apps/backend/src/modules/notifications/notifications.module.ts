import { Global, Module } from '@nestjs/common';
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
    { provide: NotificationService, useClass: DbNotificationService },
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
