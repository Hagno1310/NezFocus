import { Global, Module } from '@nestjs/common';
import { ServersModule } from '../servers/servers.module.js';
import { LiveKitKeys, LiveKitRooms, ServerApiRooms } from './livekit.js';
import { RedisVoiceSeats, VoiceSeats } from './voice-seats.js';
import { VoiceController } from './voice.controller.js';
import { VoiceRepository } from './voice.repository.js';
import { VoiceRoomsService } from './voice-rooms.service.js';
import { VoiceService, VoiceSessions } from './voice.service.js';

// WORKFLOW 4.3: other modules inject VoiceService; the Gateway injects VoiceSessions.
@Global()
@Module({
  imports: [ServersModule],
  controllers: [VoiceController],
  providers: [
    LiveKitKeys,
    { provide: LiveKitRooms, useClass: ServerApiRooms },
    { provide: VoiceSeats, useClass: RedisVoiceSeats },
    VoiceRepository,
    VoiceRoomsService,
    { provide: VoiceService, useExisting: VoiceRoomsService },
    { provide: VoiceSessions, useExisting: VoiceRoomsService },
  ],
  exports: [VoiceService, VoiceSessions],
})
export class VoiceModule {}
