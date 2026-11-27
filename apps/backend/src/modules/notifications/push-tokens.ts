import { Injectable } from '@nestjs/common';
import { PushTokensRepository } from './push-tokens.repository.js';

// REQ-AUTH-07 AC1: a session that ends stops getting push. Abstract class = DI token.
export abstract class PushTokens {
  abstract removeForSessions(sessionIds: bigint[]): Promise<void>;
}

@Injectable()
export class DbPushTokens extends PushTokens {
  constructor(private readonly repo: PushTokensRepository) {
    super();
  }

  removeForSessions(sessionIds: bigint[]) {
    return this.repo.removeForSessions(sessionIds);
  }
}
