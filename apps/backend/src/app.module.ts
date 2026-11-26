import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommonModule } from './common/common.module.js';
import { validateEnv } from './config/env.js';
import { DbModule } from './db/db.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { GatewayModule } from './modules/gateway/gateway.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MessagingModule } from './modules/messaging/messaging.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { PermissionsModule } from './modules/permissions/permissions.module.js';
import { ServersModule } from './modules/servers/servers.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { StudyModule } from './modules/study/study.module.js';
import { FriendsModule } from './modules/friends/friends.module.js';
import { DmModule } from './modules/channels/dm.module.js';
import { RedisModule } from './redis/redis.module.js';
import { VoiceModule } from './modules/voice/voice.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    CommonModule,
    EventEmitterModule.forRoot(), // DEC-14: in-process domain events (SRS 7.5.1)
    DbModule,
    RedisModule,
    StorageModule,
    GatewayModule,
    PermissionsModule,
    HealthModule,
    AuthModule,
    StudyModule,
    ServersModule,
    MessagingModule,
    FriendsModule,
    DmModule,
    NotificationsModule,
    VoiceModule,
  ],
})
export class AppModule {}
