import type { ChannelType } from './channel.contract.js';

// REQ-SRV-02 (v1.9, CR-17) name rules, shared so the app's "Sẽ lưu là # …" and duplicate
// warning never disagree with the backend's 40001 on field `name`.

export const CHANNEL_NAME_MAX = 100;

// Lowercase; whitespace → "-"; keep letters (accented Vietnamese too), digits, "-" and "_";
// merge "-" runs and trim them at both ends. "" means the name is unusable (AC9).
export const normalizeTextChannelName = (raw: string) =>
  raw
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/gu, '-')
    .replace(/[^\p{L}\p{M}\p{N}_-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

// What two names are compared on: case-insensitive, accent-sensitive ("bàn" ≠ "bạn");
// text channels on their saved name.
export const channelNameKey = (type: ChannelType, name: string) =>
  type === 'text'
    ? normalizeTextChannelName(name)
    : name.normalize('NFC').trim().toLowerCase();

interface NamedChannel {
  id?: string;
  type: ChannelType;
  name: string;
  parent_id: string | null;
}

// Same type in the same category (or the uncategorized group) clash; categories clash
// server-wide. Pass `id` when renaming or moving so a channel never clashes with itself.
export function findDuplicateChannel<C extends NamedChannel & { id: string }>(
  channels: readonly C[],
  candidate: NamedChannel,
): C | null {
  const key = channelNameKey(candidate.type, candidate.name);
  return (
    channels.find(
      (c) =>
        c.id !== candidate.id &&
        c.type === candidate.type &&
        (c.type === 'category' || c.parent_id === candidate.parent_id) &&
        channelNameKey(c.type, c.name) === key,
    ) ?? null
  );
}
