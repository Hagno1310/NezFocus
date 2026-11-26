import { Global, Module } from '@nestjs/common';
import { LoggingVoiceService, VoiceService } from './voice.service.js';

// WORKFLOW 4.3: other modules inject VoiceService.
@Global()
@Module({
  providers: [{ provide: VoiceService, useClass: LoggingVoiceService }],
  exports: [VoiceService],
})
export class VoiceModule {}
