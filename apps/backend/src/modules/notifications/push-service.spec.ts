import type { UserSettings } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import type { BlockQuery } from '../friends/block-query.js';
import type { ForegroundReader } from '../gateway/foreground.js';
import type { SettingsService } from '../users/settings.service.js';
import type {
  PushContentRepository,
  PushMessage,
} from './push-content.repository.js';
import type { PushJob } from './push-sender.js';
import type { PushTokensRepository } from './push-tokens.repository.js';
import type { PushQueue } from './push.queue.js';
import { PushDispatcher } from './push-service.js';

const AN = 1n; // recipient
const BINH = 2n; // sender
const mentionData = {
  actor_id: '2',
  server_id: '22',
  channel_id: '33',
  message_id: '44',
  via: 'user' as const,
};

function setup(
  opts: {
    foreground?: boolean;
    blocked?: boolean;
    tokens?: string[];
    locale?: 'vi' | 'en';
    hide?: boolean;
    message?: Partial<PushMessage> | null;
  } = {},
) {
  const jobs: PushJob[] = [];
  const message: PushMessage | undefined =
    opts.message === null
      ? undefined
      : {
          content: '<@1> họp lúc 9h',
          authorId: BINH,
          channelId: 33n,
          channelName: 'viec-nhom',
          serverId: 22n,
          images: 0,
          ...opts.message,
        };
  const people = new Map([
    ['1', { name: 'An', username: 'an' }],
    ['2', { name: 'Bình', username: 'binh' }],
  ]);
  const push = new PushDispatcher(
    {
      inForeground: () => opts.foreground ?? false,
    } as unknown as ForegroundReader,
    {
      isBlockedEitherWay: async () => opts.blocked ?? false,
    } as unknown as BlockQuery,
    {
      get: async () =>
        ({
          locale: opts.locale ?? 'vi',
          hide_push_content: opts.hide ?? false,
        }) as UserSettings,
    } as unknown as SettingsService,
    {
      fcmTokens: async () => opts.tokens ?? ['phone-a'],
    } as unknown as PushTokensRepository,
    {
      message: async () => message,
      people: async (ids: bigint[]) =>
        new Map([...people].filter(([id]) => ids.includes(BigInt(id)))),
      names: async () => ({
        users: new Map([['1', 'An']]),
        roles: new Map([['5', 'Nhóm trưởng']]),
        channels: new Map(),
      }),
      roleName: async (id: string) => (id === '5' ? 'Nhóm trưởng' : undefined),
      requestNote: async () => 'Mình là Bình',
      dmRecipients: async () => [AN, BINH],
    } as unknown as PushContentRepository,
    { add: async (j: PushJob[]) => void jobs.push(...j) } as PushQueue,
  );
  return { push, jobs };
}

describe('PushDispatcher (REQ-NOTIF-02)', () => {
  it('AC1: queues a mention push to every device of the recipient', async () => {
    const { push, jobs } = setup({ tokens: ['phone-a', 'phone-b'] });
    await push.forItem(AN, 90n, 'mention', mentionData);
    expect(jobs.map((j) => j.token)).toEqual(['phone-a', 'phone-b']);
    expect(jobs[0]?.payload).toEqual({
      type: 'mention',
      id: '90',
      server_id: '22',
      channel_id: '33',
      message_id: '44',
      title: 'Bình nhắc tới bạn ở #viec-nhom',
      body: '@An họp lúc 9h',
    });
  });

  it('writes the push in the recipient language, names unchanged', async () => {
    const { push, jobs } = setup({ locale: 'en' });
    await push.forItem(AN, 90n, 'reply', mentionData);
    expect(jobs[0]?.payload.title).toBe('Bình replied to you in #viec-nhom');
  });

  it('names the role a mention went through', async () => {
    const { push, jobs } = setup();
    await push.forItem(AN, 90n, 'mention', {
      ...mentionData,
      via: 'role',
      role_id: '5',
    });
    expect(jobs[0]?.payload.title).toBe(
      'Bình nhắc tới @Nhóm trưởng ở #viec-nhom',
    );
  });

  it('AC2: "Ẩn nội dung" leaves only "Bạn có tin nhắn mới"', async () => {
    const { push, jobs } = setup({ hide: true });
    await push.forItem(AN, 90n, 'mention', mentionData);
    expect(jobs[0]?.payload).toMatchObject({
      title: 'NezFocus',
      body: 'Bạn có tin nhắn mới',
    });
    expect(JSON.stringify(jobs[0]?.payload)).not.toMatch(/Bình|9h|viec-nhom/);
  });

  it('AC4 (âm): nothing when either side blocked the other', async () => {
    const { push, jobs } = setup({ blocked: true });
    await push.forItem(AN, 90n, 'mention', mentionData);
    await push.send(AN, { type: 'dm', message_id: '44', channel_id: '33' });
    expect(jobs).toEqual([]);
  });

  it('DEC-34: nothing while a device of the recipient is in the foreground', async () => {
    const { push, jobs } = setup({ foreground: true });
    await push.forItem(AN, 90n, 'mention', mentionData);
    expect(jobs).toEqual([]);
  });

  it('nothing without a token, or when the message is already gone', async () => {
    const none = setup({ tokens: [] });
    await none.push.forItem(AN, 90n, 'mention', mentionData);
    expect(none.jobs).toEqual([]);
    const gone = setup({ message: null });
    await gone.push.forItem(AN, 90n, 'mention', mentionData);
    expect(gone.jobs).toEqual([]);
  });

  it('pushes a DM with the sender as title', async () => {
    const { push, jobs } = setup({
      message: { content: 'tối nay học không', serverId: null },
    });
    await push.send(AN, { type: 'dm', message_id: '44', channel_id: '33' });
    expect(jobs[0]?.payload).toEqual({
      type: 'dm',
      id: '44',
      channel_id: '33',
      message_id: '44',
      title: 'Bình',
      body: 'tối nay học không',
    });
  });

  it('pushes a friend request with its note; hidden, neither name nor note', async () => {
    const shown = setup();
    await shown.push.forItem(AN, 91n, 'friend_request', { actor_id: '2' });
    expect(shown.jobs[0]?.payload).toEqual({
      type: 'friend_request',
      id: '91',
      title: 'Bình muốn kết bạn',
      body: 'Mình là Bình',
    });
    const hidden = setup({ hide: true });
    await hidden.push.forItem(AN, 91n, 'friend_request', { actor_id: '2' });
    expect(hidden.jobs[0]?.payload).toMatchObject({
      title: 'NezFocus',
      body: 'Bạn có lời mời kết bạn mới',
    });
  });

  it('has no push for an inbox type without one', async () => {
    const { push, jobs } = setup();
    await push.forItem(AN, 92n, 'friend_accepted', { actor_id: '2' });
    expect(jobs).toEqual([]);
  });
});
