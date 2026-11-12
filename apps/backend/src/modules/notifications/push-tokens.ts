import { Injectable, Logger } from '@nestjs/common';

// REQ-AUTH-07 AC1: a session that ends stops getting push. Abstract class = DI token.
export abstract class PushTokens {
  abstract removeForSessions(sessionIds: bigint[]): Promise<void>;
}

// ponytail: push tokens (REQ-NOTIF-02) do not exist yet; P3-B5 (#29) stores them and
// replaces this with the real delete.
@Injectable()
export class LogPushTokens extends PushTokens {
  private readonly logger = new Logger('PushTokens');

  async removeForSessions(sessionIds: bigint[]) {
    if (sessionIds.length)
      this.logger.log(
        `would remove push tokens of sessions ${sessionIds.join(', ')}`,
      );
  }
}
