import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module.js';
import {
  DbNotificationService,
  NotificationService,
} from './notification-service.js';
import { NotificationsEraser } from './notifications-eraser.js';
import { NotificationsRepository } from './notifications.repository.js';
import { PushContentRepository } from './push-content.repository.js';
import { FcmPushSender, LogPushSender, PushSender } from './push-sender.js';
import { PushDispatcher, PushService } from './push-service.js';
import { PushTokensController } from './push-tokens.controller.js';
import { PushTokensRepository } from './push-tokens.repository.js';
import { PushTokens, PushTokensService } from './push-tokens.js';
import { BullPushQueue, PushQueue, PushWorker } from './push.queue.js';
import { PushListener } from './push.listener.js';

// WORKFLOW 4.3: other modules inject NotificationService, PushService and PushTokens.
@Global()
@Module({
  imports: [UsersModule], // SettingsService: locale, hide_push_content
  controllers: [PushTokensController],
  providers: [
    NotificationsRepository,
    { provide: NotificationService, useClass: DbNotificationService },
    PushTokensRepository,
    PushTokensService,
    { provide: PushTokens, useExisting: PushTokensService },
    PushContentRepository,
    PushDispatcher,
    { provide: PushService, useExisting: PushDispatcher },
    { provide: PushQueue, useClass: BullPushQueue },
    PushWorker,
    PushListener,
    NotificationsEraser,
    {
      provide: PushSender,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const projectId = config.get<string>('FCM_PROJECT_ID');
        const clientEmail = config.get<string>('FCM_CLIENT_EMAIL');
        const privateKey = config.get<string>('FCM_PRIVATE_KEY');
        return projectId && clientEmail && privateKey
          ? new FcmPushSender({ projectId, clientEmail, privateKey })
          : new LogPushSender();
      },
    },
  ],
  exports: [NotificationService, PushService, PushTokens, NotificationsEraser],
})
export class NotificationsModule {}
