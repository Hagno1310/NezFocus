import { Injectable } from '@nestjs/common';
import type { SessionEndReason } from '@nezfocus/shared';
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
  constructor(private readonly sessions: GatewaySessions) {
    super();
  }

  async disconnect(sessionId: bigint, reason: SessionEndReason) {
    this.sessions.revoke(sessionId, reason);
  }
}
