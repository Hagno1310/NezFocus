import { describe, expect, it } from 'vitest';
import { GatewayOp } from '../gateway/gateway.contract.js';
import { parseDispatch } from '../gateway/events.contract.js';
import {
  Notification,
  NotificationData,
  NotificationType,
} from './notification.contract.js';

const ids = {
  actor_id: '11',
  server_id: '22',
  channel_id: '33',
  message_id: '44',
};

describe('notification data (REQ-NOTIF-05)', () => {
  it('lists every MVP type of notifications.type', () => {
    expect(NotificationType.options).toEqual([
      'mention',
      'reply',
      'friend_request',
      'friend_accepted',
      'task_assigned',
      'task_reminder',
      'task_unassigned',
      'missed_call',
      'owner_transferred',
      'moderation',
      'report_reviewed',
      'reports_pending',
      'profile_reset',
      'server_removed',
    ]);
    expect(Object.keys(NotificationData)).toEqual(NotificationType.options);
  });

  it('parses the four P2 types', () => {
    expect(
      NotificationData.mention.parse({ ...ids, via: 'role', role_id: '55' }),
    ).toEqual({ ...ids, via: 'role', role_id: '55' });
    expect(NotificationData.mention.parse({ ...ids, via: 'everyone' })).toEqual(
      { ...ids, via: 'everyone' },
    );
    expect(NotificationData.reply.parse(ids)).toEqual(ids);
    expect(NotificationData.friend_request.parse({ actor_id: '11' })).toEqual({
      actor_id: '11',
    });
    expect(NotificationData.friend_accepted.parse({ actor_id: '11' })).toEqual({
      actor_id: '11',
    });
  });

  it('rejects data missing a required field', () => {
    const { message_id: _, ...noMessage } = ids;
    expect(() => NotificationData.reply.parse(noMessage)).toThrow();
    expect(() => NotificationData.mention.parse(ids)).toThrow(); // via is required
    expect(() =>
      NotificationData.mention.parse({ ...ids, via: 'role' }),
    ).toThrow(); // @role needs role_id
    expect(() => NotificationData.friend_request.parse({})).toThrow();
    expect(() =>
      NotificationData.friend_accepted.parse({ actor_id: 'x' }),
    ).toThrow();
  });

  it('a notification carries the data of its own type', () => {
    const base = {
      id: '1',
      task_id: null,
      read: false,
      created_at: '2026-11-13T10:00:00.000Z',
    };
    expect(() =>
      Notification.parse({ ...base, type: 'reply', data: { actor_id: '11' } }),
    ).toThrow();
    expect(
      Notification.parse({
        ...base,
        type: 'friend_accepted',
        data: { actor_id: '11' },
      }),
    ).toEqual({ ...base, type: 'friend_accepted', data: { actor_id: '11' } });
  });

  it('NOTIFICATION_CREATE / NOTIFICATION_DELETE are gateway events (SRS 5.4)', () => {
    const notification = {
      id: '1',
      type: 'reply',
      data: ids,
      task_id: null,
      read: false,
      created_at: '2026-11-13T10:00:00.000Z',
    };
    expect(
      parseDispatch({
        op: GatewayOp.DISPATCH,
        t: 'NOTIFICATION_CREATE',
        s: 1,
        d: notification,
      }),
    ).toEqual({ t: 'NOTIFICATION_CREATE', s: 1, d: notification });
    expect(
      parseDispatch({
        op: GatewayOp.DISPATCH,
        t: 'NOTIFICATION_DELETE',
        s: 2,
        d: { ids: ['1'] },
      }),
    ).toEqual({ t: 'NOTIFICATION_DELETE', s: 2, d: { ids: ['1'] } });
  });
});
