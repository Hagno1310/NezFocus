import { Global, Module } from '@nestjs/common';
import { EventPublisher, LogEventPublisher } from './event-publisher.js';
import { LogSessionRevoker, SessionRevoker } from './session-revoker.js';

// WORKFLOW 4.3: interfaces other modules call; swap useClass when the real Gateway lands.
@Global()
@Module({
  providers: [
    { provide: SessionRevoker, useClass: LogSessionRevoker },
    { provide: EventPublisher, useClass: LogEventPublisher },
  ],
  exports: [SessionRevoker, EventPublisher],
})
export class GatewayModule {}
