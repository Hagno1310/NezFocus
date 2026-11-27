import { describe, expect, it } from 'vitest';
import {
  PUSH_CHANNEL,
  PUSH_MAX_BYTES,
  PushChannel,
  PushPayload,
  PushType,
  RegisterPushTokenRequest,
  concealPush,
  isDataPush,
  pushBytes,
} from './push.contract.js';

const mention: PushPayload = {
  type: 'mention',
  id: '90',
  server_id: '22',
  channel_id: '33',
  message_id: '44',
  title: 'Bình nhắc tới bạn ở #hoi-dap',
  body: '@An tối nay 20:30 vào Phòng học im lặng ôn tiếp nhé',
};

describe('push types (REQ-NOTIF-02)', () => {
  it('lists the push types and gives each its Android channel', () => {
    expect(PushType.options).toEqual([
      'mention',
      'reply',
      'dm',
      'friend_request',
      'call',
      'call_cancel',
      'deadline',
      'task_assigned',
      'owner_transferred',
    ]);
    expect(Object.keys(PUSH_CHANNEL)).toEqual(PushType.options);
    expect(PUSH_CHANNEL.dm).toBe('messages');
    expect(PUSH_CHANNEL.call).toBe('calls');
    expect(PUSH_CHANNEL.deadline).toBe('study');
    expect(PushChannel.options).toEqual([
      'messages',
      'calls',
      'study',
      'room-running',
    ]);
  });

  it('sends calls as data messages and the rest as notification messages (SRS 5.6)', () => {
    expect(isDataPush('call')).toBe(true);
    expect(isDataPush('call_cancel')).toBe(true);
    expect(isDataPush('mention')).toBe(false);
    expect(isDataPush('friend_request')).toBe(false);
  });
});

describe('PUT /users/@me/push-tokens', () => {
  it('takes an FCM token', () => {
    expect(
      RegisterPushTokenRequest.parse({ token: 'fcm-abc', kind: 'fcm' }),
    ).toEqual({ token: 'fcm-abc', kind: 'fcm' });
  });

  it('rejects an empty token and an unknown kind', () => {
    expect(
      RegisterPushTokenRequest.safeParse({ token: '', kind: 'fcm' }).success,
    ).toBe(false);
    expect(
      RegisterPushTokenRequest.safeParse({ token: 'x', kind: 'webpush' })
        .success,
    ).toBe(false);
  });
});

describe('push payload (SRS 5.6)', () => {
  it('parses a mention payload', () => {
    expect(PushPayload.parse(mention)).toEqual(mention);
  });

  it('rejects a payload over 4KB', () => {
    const big = { ...mention, body: 'ệ'.repeat(1400) }; // 3 bytes each in UTF-8
    expect(pushBytes(big)).toBeGreaterThan(PUSH_MAX_BYTES);
    expect(PushPayload.safeParse(big).success).toBe(false);
  });

  it('counts bytes, not characters', () => {
    const ascii = { ...mention, body: 'a' };
    const accented = { ...mention, body: 'ệ' };
    expect(pushBytes(accented) - pushBytes(ascii)).toBe(2);
  });
});

describe('Ẩn nội dung xem trước (REQ-NOTIF-02 AC2, CR-28 #36)', () => {
  it('keeps no name, channel or message of a message push', () => {
    const hidden = concealPush(mention, 'vi');
    expect(hidden).toEqual({
      ...mention,
      title: 'NezFocus',
      body: 'Bạn có tin nhắn mới',
    });
    expect(JSON.stringify(hidden)).not.toContain('Bình');
    expect(JSON.stringify(hidden)).not.toContain('20:30');
  });

  it('hides a DM and a reply the same way, in the recipient language', () => {
    const dm = { ...mention, type: 'dm' as const, title: 'Bình', body: 'hi' };
    expect(concealPush(dm, 'en')).toMatchObject({
      title: 'NezFocus',
      body: 'You have a new message',
    });
    expect(concealPush({ ...mention, type: 'reply' }, 'vi').body).toBe(
      'Bạn có tin nhắn mới',
    );
  });

  it('hides the name and note of a friend request', () => {
    const request: PushPayload = {
      type: 'friend_request',
      id: '91',
      title: 'Giang muốn kết bạn',
      body: 'Mình là Giang lớp K22',
    };
    expect(concealPush(request, 'vi')).toEqual({
      ...request,
      title: 'NezFocus',
      body: 'Bạn có lời mời kết bạn mới',
    });
  });
});
