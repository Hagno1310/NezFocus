import type { PushPayload } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { deliver, toFcmMessage, type PushSender } from './push-sender.js';

const mention: PushPayload = {
  type: 'mention',
  id: '90',
  server_id: '22',
  channel_id: '33',
  message_id: '44',
  title: 'Bình nhắc tới bạn ở #hoi-dap',
  body: '@An họp lúc 9h',
};

describe('toFcmMessage (SRS 5.6)', () => {
  it('sends a message push as a notification message on its channel, high priority', () => {
    expect(toFcmMessage('tok', mention)).toEqual({
      token: 'tok',
      notification: { title: mention.title, body: mention.body },
      data: {
        type: 'mention',
        id: '90',
        server_id: '22',
        channel_id: '33',
        message_id: '44',
      },
      android: { priority: 'high', notification: { channelId: 'messages' } },
    });
  });

  it('leaves out ids the push does not have', () => {
    const request: PushPayload = {
      type: 'friend_request',
      id: '91',
      title: 'Giang muốn kết bạn',
      body: 'hi',
    };
    expect(toFcmMessage('tok', request).data).toEqual({
      type: 'friend_request',
      id: '91',
    });
  });

  it('sends a call as a high-priority data message only', () => {
    const call: PushPayload = { ...mention, type: 'call' };
    const message = toFcmMessage('tok', call);
    expect(message.notification).toBeUndefined();
    expect(message.android).toEqual({ priority: 'high' });
    expect(message.data).toMatchObject({
      type: 'call',
      title: call.title,
      body: call.body,
    });
  });
});

describe('deliver (REQ-NOTIF-04 AC3)', () => {
  it('removes a token FCM no longer knows', async () => {
    const removed: string[][] = [];
    const sender: PushSender = { send: async () => 'unregistered' };
    await deliver({ token: 'gone', payload: mention }, sender, {
      removeTokens: async (t) => void removed.push(t),
    });
    expect(removed).toEqual([['gone']]);
  });

  it('keeps a token that got its push', async () => {
    const removed: string[][] = [];
    const sender: PushSender = { send: async () => 'sent' };
    await deliver({ token: 'ok', payload: mention }, sender, {
      removeTokens: async (t) => void removed.push(t),
    });
    expect(removed).toEqual([]);
  });

  it('throws on any other failure so the job is retried', async () => {
    const sender: PushSender = {
      send: async () => {
        throw new Error('messaging/server-unavailable');
      },
    };
    await expect(
      deliver({ token: 'ok', payload: mention }, sender, {
        removeTokens: async () => {},
      }),
    ).rejects.toThrow('server-unavailable');
  });
});
