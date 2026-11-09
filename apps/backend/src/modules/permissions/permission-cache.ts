import { Injectable } from '@nestjs/common';
import { KeyValueStore } from '../../redis/key-value-store.js';

// REQ-ROLE-08: a computed bitmap lives this long even if an invalidation is missed.
const TTL_SECONDS = 30;
// Outlives every entry, so a generation that expires and restarts never meets an old entry.
const GENERATION_SECONDS = 24 * 60 * 60;

const generationKey = (serverId: bigint) => `perm:gen:${serverId}`;

// Per server, user and scope. Call invalidateServer after any change to a role, overwrite,
// member's roles, timeout or channel's category (joining needs none: non-members aren't cached).
@Injectable()
export class PermissionCache {
  constructor(private readonly store: KeyValueStore) {}

  // `save` writes under the generation read here, so a result computed from data an
  // invalidation already replaced is never served after it.
  async lookup(serverId: bigint, field: string) {
    const { count } = await this.store.peek(generationKey(serverId));
    const key = `perm:${serverId}:${count}:${field}`;
    const hit = await this.store.get(key);
    return {
      bits: hit === null ? null : BigInt(hit),
      save: (bits: bigint) => this.store.set(key, bits.toString(), TTL_SECONDS),
    };
  }

  async invalidateServer(serverId: bigint) {
    await this.store.increment(generationKey(serverId), GENERATION_SECONDS);
  }
}
