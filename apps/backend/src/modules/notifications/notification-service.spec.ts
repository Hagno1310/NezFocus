import type { NotificationRow } from './notifications.schema.js';
import type { NotificationsRepository } from './notifications.repository.js';
import type { EventPublisher } from '../gateway/event-publisher.js';
import type { SnowflakeGenerator } from '../../common/snowflake.js';
import { DbNotificationService } from './notification-service.js';

const NOW = new Date('2026-11-13T10:00:00.000Z');
const AN = 1n;
const reply = {
  actor_id: '2',
  server_id: '3',
  channel_id: '4',
  message_id: '5',
};

function setup(existing: NotificationRow[] = []) {
  const rows = [...existing];
  const sent: { userId: bigint; t: string; d: unknown }[] = [];
  const repo = {
    insert: async (row: Omit<NotificationRow, 'createdAt'>) => {
      const dup = rows.some(
        (r) =>
          r.userId === row.userId &&
          row.data.message_id !== undefined &&
          r.data.message_id === row.data.message_id,
      );
      if (dup) return undefined;
      const created = { ...row, createdAt: NOW };
      rows.push(created);
      return created;
    },
    deleteBySource: async (source: { message_id: bigint }) => {
      const gone = rows.filter(
        (r) => r.data.message_id === String(source.message_id),
      );
      return gone.map((r) => ({ id: r.id, userId: r.userId }));
    },
  } as unknown as NotificationsRepository;
  const events = {
    toUser: async (userId: bigint, t: string, d: unknown) =>
      void sent.push({ userId, t, d }),
  } as unknown as EventPublisher;
  let id = 100n;
  const service = new DbNotificationService(
    repo,
    events,
    { next: () => id++ } as SnowflakeGenerator,
    { now: () => NOW },
  );
  return { service, rows, sent };
}

describe('NotificationService.create (REQ-NOTIF-05)', () => {
  it('stores type + data and sends NOTIFICATION_CREATE to the recipient', async () => {
    const { service, rows, sent } = setup();
    const id = await service.create(AN, 'reply', reply);
    expect(id).toBe(100n);
    expect(rows).toEqual([
      expect.objectContaining({
        id: 100n,
        userId: AN,
        type: 'reply',
        data: reply,
        taskId: null,
        readAt: null,
      }),
    ]);
    expect(sent).toEqual([
      {
        userId: AN,
        t: 'NOTIFICATION_CREATE',
        d: {
          id: '100',
          type: 'reply',
          data: reply,
          task_id: null,
          read: false,
          created_at: NOW.toISOString(),
        },
      },
    ]);
  });

  it('opts: task_id is kept, read creates the item already read', async () => {
    const { service, rows, sent } = setup();
    await service.create(
      AN,
      'task_assigned',
      { actor_id: '2' },
      {
        task_id: 9n,
        read: true,
      },
    );
    expect(rows[0]).toMatchObject({ taskId: 9n, readAt: NOW });
    expect(sent[0].d).toMatchObject({ task_id: '9', read: true });
  });

  it('a second item for the same (user, message) is not created (CR-12)', async () => {
    const { service, rows, sent } = setup();
    await service.create(AN, 'reply', reply);
    const again = await service.create(AN, 'mention', {
      ...reply,
      via: 'user',
    });
    expect(again).toBeNull();
    expect(rows).toHaveLength(1);
    expect(sent).toHaveLength(1);
  });

  it('(negative) no item for the person who caused it', async () => {
    const { service, rows, sent } = setup();
    expect(
      await service.create(2n, 'reply', reply), // actor_id is 2
    ).toBeNull();
    expect(rows).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('(negative) data that does not match its type is refused', async () => {
    const { service, rows } = setup();
    await expect(
      service.create(AN, 'reply', { actor_id: '2' } as never),
    ).rejects.toThrow();
    expect(rows).toHaveLength(0);
  });
});

describe('NotificationService.deleteBySource (REQ-NOTIF-05)', () => {
  it('sends NOTIFICATION_DELETE {ids} to each owner of a removed item', async () => {
    const { service, sent } = setup([row(10n, AN), row(11n, 7n), row(12n, AN)]);
    await service.deleteBySource({ message_id: 5n });
    expect(sent).toEqual([
      { userId: AN, t: 'NOTIFICATION_DELETE', d: { ids: ['10', '12'] } },
      { userId: 7n, t: 'NOTIFICATION_DELETE', d: { ids: ['11'] } },
    ]);
  });

  it('nothing removed → no event', async () => {
    const { service, sent } = setup();
    await service.deleteBySource({ message_id: 5n });
    expect(sent).toEqual([]);
  });
});

const row = (id: bigint, userId: bigint): NotificationRow => ({
  id,
  userId,
  type: 'reply',
  data: reply,
  taskId: null,
  readAt: null,
  createdAt: NOW,
});
