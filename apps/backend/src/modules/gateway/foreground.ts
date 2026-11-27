import { Injectable } from '@nestjs/common';
import { GatewaySessions } from './gateway-sessions.js';

// DEC-34: is one of the user's devices in the foreground? Push (REQ-NOTIF-02/04) skips them.
export abstract class ForegroundReader {
  abstract inForeground(userId: bigint): boolean;
}

@Injectable()
export class GatewayForegroundReader extends ForegroundReader {
  constructor(private readonly sessions: GatewaySessions) {
    super();
  }

  inForeground(userId: bigint) {
    return this.sessions.hasForegroundSession(userId);
  }
}
