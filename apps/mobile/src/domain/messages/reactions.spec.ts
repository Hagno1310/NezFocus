import { describe, expect, it } from 'vitest';
import { QUICK_REACTIONS, withReaction } from './reactions';

describe('withReaction (REQ-MSG-05 AC5)', () => {
  const thumbs = { emoji: '👍', count: 2, me: false };

  it('someone else adds: +1, a new emoji goes last', () => {
    expect(withReaction([thumbs], '👍', 'add', false)).toEqual([
      { emoji: '👍', count: 3, me: false },
    ]);
    expect(withReaction([thumbs], '🎉', 'add', false)).toEqual([
      thumbs,
      { emoji: '🎉', count: 1, me: false },
    ]);
  });

  it('mine twice counts once: my answer and my own event agree', () => {
    const once = withReaction([thumbs], '👍', 'add', true);
    expect(once).toEqual([{ emoji: '👍', count: 3, me: true }]);
    expect(withReaction(once, '👍', 'add', true)).toEqual(once);
  });

  it('removing the last one drops the chip; removing mine when not mine changes nothing', () => {
    expect(
      withReaction([{ emoji: '👍', count: 1, me: true }], '👍', 'remove', true),
    ).toEqual([]);
    expect(withReaction([thumbs], '👍', 'remove', true)).toEqual([thumbs]);
    expect(withReaction([thumbs], '👍', 'remove', false)).toEqual([
      { emoji: '👍', count: 1, me: false },
    ]);
  });
});

describe('QUICK_REACTIONS', () => {
  it('is the S-HOME-04 row, in order', () => {
    expect(QUICK_REACTIONS).toEqual(['👍', '❤️', '😂', '😮', '🎉', '🙏']);
  });
});
