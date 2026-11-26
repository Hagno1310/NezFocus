import { Injectable, Logger } from '@nestjs/common';
import type { SessionEndReason } from '@nezfocus/shared';
import { VoiceSessions } from '../voice/voice.service.js';
import { GatewaySessions } from './gateway-sessions.js';

// REQ-AUTH-04: close the Gateway connections of a revoked session with close code 4004
// and its revoke_reason (SRS 11.2). Owner: gateway (B). Auth calls it.
export abstract class SessionRevoker {
  abstract disconnect(
    sessionId: bigint,
    reason: SessionEndReason,
  ): Promise<void>;
}

@Injectable()
export class GatewaySessionRevoker extends SessionRevoker {
  constructor(
    private readonly sessions: GatewaySessions,
    private readonly voice: VoiceSessions,
  ) {
    super();
  }

  private readonly logger = new Logger('SessionRevoker');

  async disconnect(sessionId: bigint, reason: SessionEndReason) {
    this.sessions.revoke(sessionId, reason);
    // Signing out must not fail on voice; the seat goes away after 3 minutes anyway.
    await this.voice
      .signedOut(sessionId)
      .catch((err: unknown) => this.logger.error(`voice ${sessionId}`, err));
  }
}
