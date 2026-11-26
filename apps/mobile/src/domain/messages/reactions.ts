import type { Reaction } from '@nezfocus/shared';

// S-HOME-04 frames: the quick reactions, in this order.
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🎉', '🙏'] as const;

// One put / remove applied to a message's chips. `mine` is my own: applied once whether it
// comes from my request's answer or from my MESSAGE_REACTION_* event.
export function withReaction(
  reactions: readonly Reaction[],
  emoji: string,
  op: 'add' | 'remove',
  mine: boolean,
): Reaction[] {
  const at = reactions.findIndex((r) => r.emoji === emoji);
  const current = reactions[at];
  if (op === 'add') {
    if (!current) return [...reactions, { emoji, count: 1, me: mine }];
    if (mine && current.me) return [...reactions];
    return reactions.map((r, i) =>
      i === at ? { ...r, count: r.count + 1, me: r.me || mine } : r,
    );
  }
  if (!current || (mine && !current.me)) return [...reactions];
  if (current.count <= 1) return reactions.filter((_, i) => i !== at);
  return reactions.map((r, i) =>
    i === at ? { ...r, count: r.count - 1, me: mine ? false : r.me } : r,
  );
}
