import { Injectable, Logger } from '@nestjs/common';
import { isDataPush, PUSH_CHANNEL, type PushPayload } from '@nezfocus/shared';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Message } from 'firebase-admin/messaging';

export type PushJob = { token: string; payload: PushPayload };
export type SendResult = 'sent' | 'unregistered';

// Abstract class = DI token; e2e tests swap in a capturing fake.
export abstract class PushSender {
  abstract send(job: PushJob): Promise<SendResult>;
}

// SRS 5.6: messages are notification messages Android shows itself (app swiped away
// included) on their channel; calls are data messages the app rings. High priority so Doze
// does not hold a mention past 5 seconds (REQ-NOTIF-02 AC1).
export function toFcmMessage(token: string, payload: PushPayload): Message {
  const { title, body, ...ids } = payload;
  const data = Object.fromEntries(
    Object.entries(ids).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;
  if (isDataPush(payload.type))
    return {
      token,
      data: { ...data, title, body },
      android: { priority: 'high' },
    };
  return {
    token,
    notification: { title, body },
    data,
    android: {
      priority: 'high',
      notification: { channelId: PUSH_CHANNEL[payload.type] },
    },
  };
}

// FCM error codes meaning the token is dead for good (REQ-NOTIF-04 AC3). invalid-argument is
// also a malformed token (FCM v1); the payload itself was checked by PushPayload, and a token
// dropped by mistake comes back when the app next registers it.
const UNREGISTERED = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export class FcmPushSender extends PushSender {
  private readonly app: App;

  constructor(account: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  }) {
    super();
    // One Firebase app per process: a second Nest app (tests) reuses it.
    this.app =
      getApps().find((a) => a.name === 'push') ??
      initializeApp(
        {
          credential: cert({
            ...account,
            // .env keeps the PEM on one line with \n written out.
            privateKey: account.privateKey.replace(/\\n/g, '\n'),
          }),
        },
        'push',
      );
  }

  async send({ token, payload }: PushJob): Promise<SendResult> {
    try {
      await getMessaging(this.app).send(toFcmMessage(token, payload));
      return 'sent';
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code && UNREGISTERED.has(code)) return 'unregistered';
      throw err;
    }
  }
}

// No FCM_* (dev without Firebase, tests): the push is only logged.
@Injectable()
export class LogPushSender extends PushSender {
  private readonly logger = new Logger('PushSender');

  async send({ payload }: PushJob): Promise<SendResult> {
    this.logger.log(`push ${payload.type}: ${payload.title}`);
    return 'sent';
  }
}

export async function deliver(
  job: PushJob,
  sender: PushSender,
  tokens: { removeTokens(tokens: string[]): Promise<void> },
) {
  if ((await sender.send(job)) === 'unregistered')
    await tokens.removeTokens([job.token]);
}
