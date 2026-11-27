import { Injectable } from '@nestjs/common';
import type { PushTokenKind } from '@nezfocus/shared';
import { PushTokensRepository } from './push-tokens.repository.js';

// REQ-AUTH-07 AC1: a session that ends stops getting push. Abstract class = DI token.
export abstract class PushTokens {
  abstract removeForSessions(sessionIds: bigint[]): Promise<void>;
}

// SRS 5.3 Devices (REQ-NOTIF-02/04): the device tokens of signed-in sessions.
@Injectable()
export class PushTokensService extends PushTokens {
  constructor(private readonly repo: PushTokensRepository) {
    super();
  }

  register(
    userId: bigint,
    sessionId: bigint,
    token: string,
    kind: PushTokenKind,
  ) {
    return this.repo.register(userId, sessionId, token, kind);
  }

  remove(userId: bigint, token: string) {
    return this.repo.remove(userId, token);
  }

  removeForSessions(sessionIds: bigint[]) {
    return this.repo.removeForSessions(sessionIds);
  }
}
