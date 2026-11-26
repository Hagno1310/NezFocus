import {
  ErrorCode,
  type ChannelResponse,
  type InvitePreview,
  type ServerResponse,
} from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { homeStore } from '../servers/homeStore';
import { voiceStore } from '../voice/voiceSession';
import { voiceView } from '../voice/voiceView';
import {
  arrive,
  formatCount,
  joinDestination,
  joinInvite,
  lookupInvite,
  memberDestination,
} from './joinInvite';

const apiError = (code: number) => ({ code, message: 'x' });
const preview: InvitePreview = {
  code: 'Xs7Lp3Qd',
  server: {
    id: '9000',
    name: 'Ôn thi Xác suất thống kê',
    icon_url: null,
    member_count: 18,
    online_count: 4,
  },
  inviter: { display_name: 'Chi', avatar: null },
  channel: null,
};

const channel = (
  id: string,
  type: ChannelResponse['type'],
  position: number,
  parent: string | null = null,
): ChannelResponse =>
  ({
    id,
    server_id: '9000',
    type,
    name: id,
    parent_id: parent,
    position,
  }) as ChannelResponse;
// THÔNG TIN: #chao-mung, #hoi-dap · PHÒNG HỌC: Phòng học im lặng
const server = {
  id: '9000',
  channels: [
    channel('info', 'category', 0),
    channel('chao-mung', 'text', 0, 'info'),
    channel('hoi-dap', 'text', 1, 'info'),
    channel('rooms', 'category', 1),
    channel('phong-im-lang', 'voice', 0, 'rooms'),
  ],
} as ServerResponse;

describe('S-HOME-06 join-by-code: lookupInvite', () => {
  it('a bad format never reaches the backend', async () => {
    const result = await lookupInvite(
      {
        previewInvite: async () => {
          throw new Error('called');
        },
      },
      'k7Qm-2xPa',
    );
    expect(result).toEqual({ ok: false, error: 'bad-format' });
  });

  it('takes the code out of a pasted link and keeps ?channel=', async () => {
    const asked: string[] = [];
    const result = await lookupInvite(
      {
        previewInvite: async (code) => {
          asked.push(code);
          return preview;
        },
      },
      'https://nezfocus.app/invite/Xs7Lp3Qd?channel=77',
    );
    expect(asked).toEqual(['Xs7Lp3Qd']);
    expect(result).toEqual({
      ok: true,
      code: 'Xs7Lp3Qd',
      channelId: '77',
      preview,
    });
  });

  it.each([
    [apiError(ErrorCode.InviteInvalid), 'invalid'],
    [apiError(ErrorCode.RateLimited), 'rate-limited'],
    [new TypeError('Network request failed'), 'network'],
    [apiError(ErrorCode.InternalError), 'other'],
  ] as const)('%o → %s', async (err, error) => {
    const result = await lookupInvite(
      {
        previewInvite: async () => {
          throw err;
        },
      },
      'Xs7Lp3Qd',
    );
    expect(result).toEqual({ ok: false, error });
  });
});

describe('S-MOD-01 joinInvite (REQ-SRV-04)', () => {
  it('AC1: the joined server', async () => {
    const result = await joinInvite(
      { acceptInvite: async () => server },
      'Xs7Lp3Qd',
    );
    expect(result).toEqual({ ok: true, server });
  });

  it.each([
    [apiError(ErrorCode.InviteInvalid), 'invalid'], // expired-on-join
    [apiError(ErrorCode.BannedFromServer), 'banned'], // AC2
    [apiError(ErrorCode.MaxServersReached), 'max-servers'],
    [new TypeError('Network request failed'), 'network'],
  ] as const)('%o → %s', async (err, error) => {
    const result = await joinInvite(
      {
        acceptInvite: async () => {
          throw err;
        },
      },
      'Xs7Lp3Qd',
    );
    expect(result).toEqual({ ok: false, error });
  });
});

describe('where joining leads (S-MOD-01 › Tương tác)', () => {
  it('the first text channel the user can view (#chao-mung)', () => {
    expect(joinDestination(server, preview, undefined)).toEqual({
      kind: 'channel',
      channelId: 'chao-mung',
    });
  });

  it('room-invite: the room preview, not a voice connection', () => {
    expect(
      joinDestination(
        server,
        {
          ...preview,
          channel: { id: 'phong-im-lang', name: 'Phòng học im lặng' },
        },
        undefined,
      ),
    ).toEqual({ kind: 'room', channelId: 'phong-im-lang' });
  });

  it('?channel= of a text channel opens that channel; an unknown one falls back', () => {
    expect(joinDestination(server, preview, 'hoi-dap')).toEqual({
      kind: 'channel',
      channelId: 'hoi-dap',
    });
    expect(joinDestination(server, preview, 'gone')).toEqual({
      kind: 'channel',
      channelId: 'chao-mung',
    });
  });
});

describe('already-member (SRV-04 AC3, SRV-07 v1.6)', () => {
  it('?channel= wins; else the channel open in that server; else the first text channel', () => {
    expect(memberDestination(server, 'phong-im-lang', null)).toEqual({
      kind: 'room',
      channelId: 'phong-im-lang',
    });
    expect(
      memberDestination(server, undefined, {
        serverId: '9000',
        channelId: 'hoi-dap',
      }),
    ).toEqual({ kind: 'channel', channelId: 'hoi-dap' });
    expect(
      memberDestination(server, undefined, {
        serverId: 'other',
        channelId: 'x',
      }),
    ).toEqual({ kind: 'channel', channelId: 'chao-mung' });
  });
});

describe('formatCount (S-MOD-01 › số lớn)', () => {
  it('groups thousands with a dot, 0 stays', () => {
    expect(formatCount(12480)).toBe('12.480');
    expect(formatCount(1204)).toBe('1.204');
    expect(formatCount(18)).toBe('18');
    expect(formatCount(0)).toBe('0');
  });
});

describe('arrive (VC-01: a room opens its preview, never voice)', () => {
  it('a room invite opens S-ROOM-01 `not-joined` over the server', () => {
    arrive('srv', { kind: 'room', channelId: 'phong-im-lang' });
    expect(voiceView.getState().open).toEqual({
      serverId: 'srv',
      channelId: 'phong-im-lang',
    });
    expect(homeStore.getState().selectedServerId).toBe('srv');
    expect(voiceStore.getState().call).toBeNull();
  });
});
