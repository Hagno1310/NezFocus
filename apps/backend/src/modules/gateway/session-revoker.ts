import { Injectable, Logger } from '@nestjs/common';
import type { SessionEndReason } from '@nezfocus/shared';

// REQ-AUTH-04: close the Gateway connections of a revoked session with close code 4004
// and its revoke_reason (SRS 11.2). Owner: gateway (B). Auth calls it; P0-5.2 replaces the stand-in.
export abstract class SessionRevoker {
  abstract disconnect(
    sessionId: bigint,
    reason: SessionEndReason,
  ): Promise<void>;
}

// ponytail: stand-in until the Gateway exists (P0-5.2); only logs.
@Injectable()
export class LogSessionRevoker extends SessionRevoker {
  private readonly logger = new Logger('SessionRevoker');

  async disconnect(sessionId: bigint, reason: SessionEndReason) {
    this.logger.log(
      `would close Gateway of session ${sessionId}: 4004 ${reason}`,
    );
  }
}
