import { Global, Module } from '@nestjs/common';
import { LogVoiceService, VoiceService } from './voice.service.js';

// WORKFLOW 4.3: other modules inject VoiceService.
@Global()
@Module({
  providers: [{ provide: VoiceService, useClass: LogVoiceService }],
  exports: [VoiceService],
})
export class VoiceModule {}
