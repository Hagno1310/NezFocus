import { Test } from '@nestjs/testing';
import { VoiceModule } from './voice.module.js';
import { VoiceService } from './voice.service.js';

describe('VoiceModule (P3-B1.1 #137)', () => {
  it('lets other modules inject VoiceService; the stub sees nobody in a room', async () => {
    const app = await Test.createTestingModule({
      imports: [VoiceModule],
    }).compile();
    const voice = app.get(VoiceService);
    expect(await voice.seatOf(1n)).toBeNull();
    expect(await voice.disconnect(1n, { serverId: 2n }, 'kicked')).toBe(false);
  });
});
