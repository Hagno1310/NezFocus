import { randomInt } from 'node:crypto';
import type { InviteRow } from './servers.schema.js';

// REQ-SRV-03 AC1/AC2/AC4: revoked, expired or used up → 40041.
export const isLive = (invite: InviteRow, now: Date) =>
  !invite.revokedAt &&
  (!invite.expiresAt || invite.expiresAt > now) &&
  (invite.maxUses === 0 || invite.uses < invite.maxUses);

// The chosen duration, read back from the row (decision 19/11/2026: no extra column).
export const maxAgeOf = (invite: InviteRow) =>
  invite.expiresAt
    ? Math.round(
        (invite.expiresAt.getTime() - invite.createdAt.getTime()) / 1000,
      )
    : 0;

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const LENGTH = 8; // 62^8 ≈ 2^47.6 (REQ-SRV-03: ≥ 47 bits)

// Abstract class = DI token; tests pass a predictable one.
export abstract class InviteCodes {
  abstract next(): string;
}

export class RandomInviteCodes extends InviteCodes {
  next() {
    let code = '';
    for (let i = 0; i < LENGTH; i++)
      code += ALPHABET[randomInt(ALPHABET.length)];
    return code;
  }
}
