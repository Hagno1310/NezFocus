import { InviteCode, SnowflakeId } from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';

// REQ-SRV-07 v1.2: an invite opened while signed out, kept on this phone only (SRS 7.3.2,
// not on the backend) through sign-up, the code step and Complete account, even if the app
// is killed; dropped once joined, closed, or after 24 hours.
export const PENDING_INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export type PendingInvite = {
  code: string;
  channel?: string; // ?channel= (STUDY-16)
  serverName: string; // for the banner (spec 01)
  savedAt: string; // ISO
};

// What was written by an older build or by hand is ignored.
function parse(raw: string): PendingInvite | null {
  try {
    const v = JSON.parse(raw) as Partial<PendingInvite>;
    const ok =
      InviteCode.safeParse(v.code).success &&
      (v.channel === undefined || SnowflakeId.safeParse(v.channel).success) &&
      typeof v.serverName === 'string' &&
      typeof v.savedAt === 'string' &&
      !Number.isNaN(Date.parse(v.savedAt));
    return ok ? (v as PendingInvite) : null;
  } catch {
    return null;
  }
}

export interface PendingInviteStorage {
  load(): Promise<string | null>;
  save(raw: string): Promise<void>;
  clear(): Promise<void>;
}

export function createPendingInvites(
  storage: PendingInviteStorage,
  now: () => Date = () => new Date(),
) {
  const store = createStore<{ invite: PendingInvite | null }>(() => ({
    invite: null,
  }));
  const live = (invite: PendingInvite | null) =>
    invite &&
    now().getTime() - new Date(invite.savedAt).getTime() <=
      PENDING_INVITE_TTL_MS
      ? invite
      : null;
  const forget = async () => {
    store.setState({ invite: null });
    await storage.clear();
  };
  return {
    store,
    current: () => live(store.getState().invite),
    async restore() {
      const raw = await storage.load();
      const saved = raw ? parse(raw) : null;
      if (live(saved)) store.setState({ invite: saved });
      else if (raw) await forget();
    },
    // `guest` "Tạo tài khoản để tham gia" / "Đăng nhập": only then is it kept (spec 10).
    async keep(invite: Omit<PendingInvite, 'savedAt'>) {
      const saved = { ...invite, savedAt: now().toISOString() };
      store.setState({ invite: saved });
      await storage.save(JSON.stringify(saved));
    },
    async drop(code: string) {
      if (store.getState().invite?.code === code) await forget();
    },
  };
}
export type PendingInvites = ReturnType<typeof createPendingInvites>;

// Spec 01 › Quy ước chung: at most 40 characters in the banner, cut at a word boundary.
export function bannerServerName(name: string, max = 40) {
  if (name.length <= max) return name;
  const cut = name.slice(0, max + 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : name.slice(0, max)).trimEnd()}…`;
}
