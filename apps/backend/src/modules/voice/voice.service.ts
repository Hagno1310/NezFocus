import { Injectable, Logger } from '@nestjs/common';
import type { VoiceLeaveReason } from '@nezfocus/shared';

// Only a room inside this scope counts: kicked from server S → only S's rooms.
export type VoiceScope = { serverId?: bigint; channelId?: bigint };
export type VoiceSeat = { serverId: bigint; channelId: bigint };

// REQ-ROLE-05 AC4, REQ-SRV-05 AC5, REQ-VC-04. Owner: voice (B). Other modules inject this
// (WORKFLOW 4.3): kick / ban / timeout (P3-A3.1 #126), leave server (P3-A4.1 #130).
export abstract class VoiceService {
  // Takes the user out of their room now (no 3-minute grace); their own VOICE_STATE_UPDATE
  // carries `reason`. false = they were not in a room of that scope.
  abstract disconnect(
    userId: bigint,
    scope: VoiceScope,
    reason: VoiceLeaveReason,
  ): Promise<boolean>;
  // The room the user is in (away included), for "Bạn cũng sẽ rời {phòng}" and the timeout sheet.
  abstract seatOf(userId: bigint): Promise<VoiceSeat | null>;
}

// ponytail: logs only, nobody is ever in a room; P3-B1.2 (#138) replaces it with LiveKit.
@Injectable()
export class LoggingVoiceService extends VoiceService {
  private readonly logger = new Logger('VoiceService');

  disconnect(userId: bigint, scope: VoiceScope, reason: VoiceLeaveReason) {
    this.logger.log(
      `disconnect ${userId} ${JSON.stringify(scope, (_, v: unknown) => (typeof v === 'bigint' ? v.toString() : v))} ${reason}`,
    );
    return Promise.resolve(false);
  }

  seatOf() {
    return Promise.resolve(null);
  }
}
