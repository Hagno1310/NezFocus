import {
  ErrorCode,
  type InvitePreview,
  type InviteResponse,
} from '@nezfocus/shared';
import type { InviteRepository } from '../../domain/invites/InviteRepository';
import { ApiError } from '../api/client';
import { fakeServerRepository } from '../servers/FakeServerRepository';

// Codes that play each S-MOD-01 / S-HOME-06 path (EXPO_PUBLIC_FAKE=invites). Sample data:
// spec 10 › Dữ liệu mẫu, spec 02 › Dữ liệu mẫu (invite k7Qm2xPa).
export const FAKE_INVITES = {
  valid: 'Xs7Lp3Qd', // Chi → Ôn thi Xác suất thống kê, 18 · 4 online
  room: 'Rm8Kp2Lw', // same server, a room invite (Phòng học im lặng)
  member: 'k7Qm2xPa', // Ôn thi Giải tích 2: An is in it (already-member)
  expired: 'Mb2Wq9Tz', // 40041
  banned: 'Bn6Tq3Zx', // preview fine, Tham gia → 40306
  full: 'Fu4Lm7Np', // preview fine, Tham gia → 40011
  noInviter: 'Nv5Hc8Rd', // the creator left: "Bạn được mời vào"
  slow: 'Sl9Wd2Kq', // 40029
} as const;
// S-HOME-07 `error`: asking for a 1-use link fails.
export const FAKE_INVITE_FAILING_USES = 1;

const fail = (code: ErrorCode) =>
  new ApiError(Math.floor(code / 100), {
    code,
    message: `fake ${code}`,
    retry_after: code === ErrorCode.RateLimited ? 60 : undefined,
  });

const XSTK = {
  id: '9000',
  name: 'Ôn thi Xác suất thống kê',
  icon_url: null,
  member_count: 18,
  online_count: 4,
};

export function createFakeInviteRepository(
  delayMs = 600,
  now: () => Date = () => new Date(),
): InviteRepository {
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const made: InviteResponse[] = [];
  const revoked = new Set<string>();
  let joined: string | null = null; // the fake server id once joined
  let next = 0;

  const preview = (code: string): InvitePreview => {
    const chi = { display_name: 'Chi', avatar: null };
    switch (code) {
      case FAKE_INVITES.valid:
      case FAKE_INVITES.banned:
      case FAKE_INVITES.full:
        return {
          code,
          server: { ...XSTK, id: joined ?? XSTK.id },
          inviter: chi,
          channel: null,
        };
      case FAKE_INVITES.room:
        return {
          code,
          server: { ...XSTK, id: joined ?? XSTK.id },
          inviter: chi,
          channel: { id: '9001', name: 'Phòng học im lặng' },
        };
      case FAKE_INVITES.noInviter:
        return {
          code,
          server: { ...XSTK, id: joined ?? XSTK.id },
          inviter: null,
          channel: null,
        };
      case FAKE_INVITES.member: {
        const gt2 = fakeServerRepository.summaries()[0]!;
        return {
          code,
          server: {
            id: gt2.id,
            name: gt2.name,
            icon_url: gt2.icon_url,
            member_count: 24,
            online_count: 6,
          },
          inviter: { display_name: 'Bình', avatar: null },
          channel: null,
        };
      }
      case FAKE_INVITES.slow:
        throw fail(ErrorCode.RateLimited);
      default:
        throw fail(ErrorCode.InviteInvalid);
    }
  };

  return {
    async createInvite(channelId, body) {
      await wait();
      const max_age = body.max_age ?? 604_800;
      const max_uses = body.max_uses ?? 0;
      if (max_uses === FAKE_INVITE_FAILING_USES)
        throw fail(ErrorCode.InternalError);
      const same = made.find(
        (i) =>
          i.channel_id === channelId &&
          i.max_age === max_age &&
          i.max_uses === max_uses &&
          !revoked.has(i.code),
      );
      if (same) return same;
      const at = now();
      const invite: InviteResponse = {
        // The first one is the sample k7Qm2xPa.
        code: next++ === 0 ? 'k7Qm2xPa' : `Fk${String(next).padStart(6, '0')}`,
        server_id: '100',
        channel_id: channelId,
        max_age,
        max_uses,
        uses: 0,
        expires_at: max_age
          ? new Date(at.getTime() + max_age * 1000).toISOString()
          : null,
        created_at: at.toISOString(),
      };
      made.push(invite);
      return invite;
    },
    async revokeInvite(code) {
      await wait();
      revoked.add(code);
    },
    async previewInvite(code) {
      await wait();
      if (revoked.has(code)) throw fail(ErrorCode.InviteInvalid);
      return preview(code);
    },
    async acceptInvite(code) {
      await wait();
      const p = preview(code);
      if (code === FAKE_INVITES.banned) throw fail(ErrorCode.BannedFromServer);
      if (code === FAKE_INVITES.full) throw fail(ErrorCode.MaxServersReached);
      if (code === FAKE_INVITES.member)
        return fakeServerRepository.getServer(p.server.id);
      if (joined) return fakeServerRepository.getServer(joined);
      const server = fakeServerRepository.join(
        p.server.name,
        'study_server',
        p.server.member_count + 1,
      );
      joined = server.id;
      return server;
    },
  };
}

export const fakeInviteRepository = createFakeInviteRepository();
