import { DmChannel } from '@nezfocus/shared';
import type { LocalDms } from '../../domain/dm/DmRepository';
import { dmChannels } from '../db/schema';
import { padId, unpadId, type LocalDb } from '../db/types';

export function createLocalDms(db: () => Promise<LocalDb>): LocalDms {
  return {
    async all() {
      const rows = await (await db()).select().from(dmChannels);
      return rows.flatMap((r) => {
        const parsed = DmChannel.safeParse(JSON.parse(r.json));
        return parsed.success && unpadId(r.channelId) === parsed.data.id
          ? [parsed.data]
          : [];
      });
    },
    async replace(list) {
      const d = await db();
      await d.delete(dmChannels);
      if (list.length)
        await d.insert(dmChannels).values(
          list.map((c) => ({
            channelId: padId(c.id),
            json: JSON.stringify(c),
          })),
        );
    },
  };
}
