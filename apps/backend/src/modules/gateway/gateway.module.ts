import { Global, Module } from '@nestjs/common';
import { SnowflakeGenerator } from '../../common/snowflake.js';
import { AuthModule } from '../auth/auth.module.js';
import { ServersModule } from '../servers/servers.module.js';
import { UsersModule } from '../users/users.module.js';
import { EventPublisher, GatewayEventPublisher } from './event-publisher.js';
import { ForegroundReader, GatewayForegroundReader } from './foreground.js';
import { GatewaySessions } from './gateway-sessions.js';
import { GatewayListener } from './gateway.listener.js';
import { PresenceRepository } from './presence.repository.js';
import {
  PresenceReader,
  PresenceService,
  PresenceSink,
} from './presence.service.js';
import { GatewaySessionRevoker, SessionRevoker } from './session-revoker.js';

// WORKFLOW 4.3: EventPublisher, SessionRevoker, PresenceSink / PresenceReader, ForegroundReader
// are what other modules inject.
@Global()
@Module({
  imports: [AuthModule, UsersModule, ServersModule],
  providers: [
    {
      provide: GatewaySessions,
      inject: [SnowflakeGenerator],
      useFactory: (ids: SnowflakeGenerator) => new GatewaySessions(ids),
    },
    GatewayListener,
    { provide: SessionRevoker, useClass: GatewaySessionRevoker },
    { provide: EventPublisher, useClass: GatewayEventPublisher },
    PresenceRepository,
    PresenceService,
    { provide: PresenceSink, useExisting: PresenceService },
    { provide: PresenceReader, useExisting: PresenceService },
    { provide: ForegroundReader, useClass: GatewayForegroundReader },
  ],
  exports: [
    SessionRevoker,
    EventPublisher,
    PresenceSink,
    PresenceReader,
    ForegroundReader,
  ],
})
export class GatewayModule {}
