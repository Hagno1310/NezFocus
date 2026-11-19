import {
  DEFAULT_INVITE_MAX_AGE,
  DEFAULT_INVITE_MAX_USES,
  ErrorCode,
  type InviteMaxAge,
  type InviteMaxUses,
  type InviteResponse,
} from '@nezfocus/shared';
import { asApiError } from '../auth/authFlow';
import type { InviteRepository } from './InviteRepository';

export type InviteSettings = {
  max_age: InviteMaxAge;
  max_uses: InviteMaxUses;
};

// Decision 19/11/2026: every opening of the sheet starts from these (spec 02 S-HOME-07).
export const DEFAULT_INVITE_SETTINGS: InviteSettings = {
  max_age: DEFAULT_INVITE_MAX_AGE,
  max_uses: DEFAULT_INVITE_MAX_USES,
};

export type InviteError = 'network' | 'forbidden' | 'other';

const errorOf = (err: unknown): InviteError => {
  const e = asApiError(err);
  if (!e) return 'network';
  return e.code === ErrorCode.Forbidden ? 'forbidden' : 'other';
};

// S-HOME-07 `offline`: the last invite fetched per channel, kept in memory for this run.
export type InviteCache = Map<string, InviteResponse>;
export const createInviteCache = (): InviteCache => new Map();
export const inviteCache = createInviteCache();

export function cachedInvite(
  cache: InviteCache,
  channelId: string,
  now: Date,
): InviteResponse | null {
  const invite = cache.get(channelId);
  if (!invite) return null;
  const expired =
    invite.expires_at !== null && new Date(invite.expires_at) <= now;
  const usedUp = invite.max_uses > 0 && invite.uses >= invite.max_uses;
  return expired || usedUp ? null : invite;
}

// S-HOME-07 `loading` → `default` / `error`: reuse or make an invite with these settings.
export async function getInvite(
  repo: Pick<InviteRepository, 'createInvite'>,
  channelId: string,
  settings: InviteSettings,
  cache: InviteCache,
): Promise<
  { ok: true; invite: InviteResponse } | { ok: false; error: InviteError }
> {
  try {
    const invite = await repo.createInvite(channelId, settings);
    cache.set(channelId, invite);
    return { ok: true, invite };
  } catch (err) {
    return { ok: false, error: errorOf(err) };
  }
}

// SRV-03 AC4: "Thu hồi", no confirmation.
export async function revokeInvite(
  repo: Pick<InviteRepository, 'revokeInvite'>,
  invite: InviteResponse,
  cache: InviteCache,
): Promise<{ ok: true } | { ok: false; error: InviteError }> {
  try {
    await repo.revokeInvite(invite.code);
    if (cache.get(invite.channel_id)?.code === invite.code)
      cache.delete(invite.channel_id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorOf(err) };
  }
}

// S-HOME-07: the field shows the link without the scheme so the code is never cut.
export const displayLink = (url: string) => url.replace(/^https?:\/\//, '');
