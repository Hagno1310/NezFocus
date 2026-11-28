import {
  ErrorCode,
  Permission,
  canActOnMember,
  canTimeOutMember,
  hasPermission,
  isTimedOut,
  type ServerMember,
} from '@nezfocus/shared';
import { asApiError } from '../auth/authFlow';
import { localTime } from '../study/stats';
import { untilText } from './members';
import type { RoleActor } from './roles';

export type ModerationRows = {
  // 'running': "Đổi thời hạn tạm khóa ›" + "Gỡ tạm khóa" (v1.9, CR-17 #12)
  timeout: 'set' | 'running' | null;
  kick: boolean;
  ban: boolean;
};

const NONE: ModerationRows = { timeout: null, kick: false, ban: false };

// REQ-ROLE-05: each row by its permission, none on the Owner, on a role level or above, or on
// oneself (`member-blocked`); "Tạm khóa" not on an ADMINISTRATOR (CR-28 #18).
export function moderationRows(
  actor: RoleActor,
  target: ServerMember,
  now: number,
): ModerationRows {
  const them = { userId: target.user.id, roleIds: target.role_ids };
  if (
    them.userId === actor.member.userId ||
    !canActOnMember(actor.server, actor.member, them)
  )
    return NONE;
  const can = (bit: bigint) => hasPermission(actor.perms, bit);
  const timeout = !can(Permission.MODERATE_MEMBERS)
    ? null
    : isTimedOut(target.timeout_until, now)
      ? 'running'
      : canTimeOutMember(actor.server, actor.member, them)
        ? 'set'
        : null;
  return {
    timeout,
    kick: can(Permission.KICK_MEMBERS),
    ban: can(Permission.BAN_MEMBERS),
  };
}

// `timeout-sheet`: "Hết lúc 21:12 hôm nay" / "Hết lúc 20:12, 19/10".
export function timeoutEnd(now: number, ms: number, timeZone: string) {
  const end = localTime(new Date(now + ms).toISOString(), timeZone);
  const today = localTime(new Date(now).toISOString(), timeZone).date;
  if (end.date === today) return { time: end.time, date: null };
  const [, m, d] = end.date.split('-');
  return { time: end.time, date: `${d}/${m}` };
}

// `timed-out` chip: "Tạm khóa tới 21:12 · Gửi tin liên tục" (CR-28 #40).
export const timeoutChip = (
  until: string,
  reason: string | null,
  now: number,
  timeZone: string,
) => ({ until: untilText(until, now, timeZone), reason });

export type ModerationError = 'hierarchy' | 'gone' | 'failed';

// 40301: "{tên} vừa có vai trò ngang hoặc cao hơn bạn…"; anything else, the network included:
// "Chưa thực hiện được. Kiểm tra kết nối rồi thử lại." (spec 08 › Edge case P2).
export function moderationErrorOf(err: unknown): ModerationError {
  const api = asApiError(err);
  if (api?.code === ErrorCode.InsufficientRoleHierarchy) return 'hierarchy';
  if (api?.code === ErrorCode.NotFound) return 'gone';
  return 'failed';
}
