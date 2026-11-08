import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module.js';
import { validateEnv } from './config/env.js';
import { DbModule } from './db/db.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { GatewayModule } from './modules/gateway/gateway.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PermissionsModule } from './modules/permissions/permissions.module.js';
import { ServersModule } from './modules/servers/servers.module.js';
import { StudyModule } from './modules/study/study.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    CommonModule,
    DbModule,
    RedisModule,
    GatewayModule,
    PermissionsModule,
    HealthModule,
    AuthModule,
    StudyModule,
    ServersModule,
  ],
})
export class AppModule {}
