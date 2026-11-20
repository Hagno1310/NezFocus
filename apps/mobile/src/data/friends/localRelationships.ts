import { Relationship, RelationshipType } from '@nezfocus/shared';
import type { LocalRelationships } from '../../domain/friends/FriendRepository';
import { relationships } from '../db/schema';
import { padId, unpadId, type LocalDb } from '../db/types';

// ponytail: rewrites every row on each change (≤ a few hundred); per-row upsert when lists grow.
export function createLocalRelationships(
  db: () => Promise<LocalDb>,
): LocalRelationships {
  return {
    async all() {
      const rows = await (await db()).select().from(relationships);
      return rows.flatMap((r) => {
        const parsed = Relationship.safeParse(JSON.parse(r.json));
        return parsed.success && unpadId(r.userId) === parsed.data.user.id
          ? [parsed.data]
          : [];
      });
    },
    async replace(list) {
      const d = await db();
      await d.delete(relationships);
      if (list.length)
        await d.insert(relationships).values(
          list.map((r) => ({
            userId: padId(r.user.id),
            type: RelationshipType.options.indexOf(r.type),
            json: JSON.stringify(r),
          })),
        );
    },
  };
}
