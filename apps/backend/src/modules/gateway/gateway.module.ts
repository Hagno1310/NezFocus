import { Global, Module } from '@nestjs/common';
import { LogSessionRevoker, SessionRevoker } from './session-revoker.js';

// WORKFLOW 4.3: interfaces other modules call; swap useClass when the real Gateway lands.
@Global()
@Module({
  providers: [{ provide: SessionRevoker, useClass: LogSessionRevoker }],
  exports: [SessionRevoker],
})
export class GatewayModule {}
