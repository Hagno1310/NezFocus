import { Injectable, Logger } from '@nestjs/common';
import type { PushRequest } from '@nezfocus/shared';

// REQ-NOTIF-02, CR-28 #36: push that has no inbox item (DM, calls). Owner: notifications (B);
// other modules inject this (WORKFLOW 4.3). Push of an inbox item goes out from
// NotificationService.create. Skipped when a device is in the foreground (DEC-34, calls
// excepted), when either side blocked the other, or when the user has no token.
export abstract class PushService {
  abstract send(userId: bigint, request: PushRequest): Promise<void>;
}

// ponytail: P3-B5.2 (#153) replaces this with the FCM sender (BullMQ job, retry).
@Injectable()
export class LogPushService extends PushService {
  private readonly logger = new Logger('PushService');

  async send(userId: bigint, request: PushRequest) {
    this.logger.log(`would push ${request.type} to ${userId}`);
  }
}
