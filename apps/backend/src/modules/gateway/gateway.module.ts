import { Global, Module } from '@nestjs/common';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { EventPublisher, GatewayEventPublisher } from './event-publisher.js';
import { GatewaySessions } from './gateway-sessions.js';
import { GatewayServer } from './gateway.server.js';
import { GatewaySessionRevoker, SessionRevoker } from './session-revoker.js';

// WORKFLOW 4.3: EventPublisher and SessionRevoker are what other modules inject.
@Global()
@Module({
  imports: [AuthModule, UsersModule],
  providers: [
    {
      provide: GatewaySessions,
      inject: [SnowflakeGenerator],
      useFactory: (ids: SnowflakeGenerator) => new GatewaySessions(ids),
    },
    GatewayServer,
    { provide: SessionRevoker, useClass: GatewaySessionRevoker },
    { provide: EventPublisher, useClass: GatewayEventPublisher },
  ],
  exports: [SessionRevoker, EventPublisher],
})
export class GatewayModule {}
