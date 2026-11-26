// C-25 EmojiPicker search (chốt 26/11/2026): Vietnamese and English names and keywords
// whatever the app's language, without diacritics. Rows come from emojiData.json:
// [emoji, category, en name, en keywords, vi name, vi keywords] (keywords comma-joined).
export type EmojiRow = [string, number, string, string, string, string];

export type Emoji = { emoji: string; category: number };

type Words = { name: string; nameWords: string[]; keywords: string[] };
type Indexed = Emoji & { order: number; en: Words; vi: Words };

export const foldText = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

const words = (name: string, keywords: string): Words => {
  const folded = foldText(name);
  return {
    name: folded,
    nameWords: folded.split(/[\s,:.-]+/).filter(Boolean),
    keywords: keywords ? keywords.split(',').map(foldText) : [],
  };
};

export const emojiIndex = (rows: readonly EmojiRow[]): Indexed[] =>
  rows.map(([emoji, category, en, enTags, vi, viTags], order) => ({
    emoji,
    category,
    order,
    en: words(en, enTags),
    vi: words(vi, viTags),
  }));

// 0 = start of the name or of one of its words, 1 = start of a keyword, null = no match.
const rank = (w: Words, q: string) => {
  if (w.name.startsWith(q) || w.nameWords.some((x) => x.startsWith(q)))
    return 0;
  if (w.keywords.some((k) => k.startsWith(q))) return 1;
  return null;
};

export function searchEmoji(
  index: readonly Indexed[],
  query: string,
  lang: 'vi' | 'en',
): Emoji[] {
  const q = foldText(query);
  if (!q) return [];
  const other = lang === 'vi' ? 'en' : 'vi';
  const hits: { e: Indexed; score: number }[] = [];
  for (const e of index) {
    const mine = rank(e[lang], q);
    const theirs = rank(e[other], q);
    // Name before keyword; at the same level, the app's language first.
    const score = Math.min(
      mine === null ? Infinity : mine * 2,
      theirs === null ? Infinity : theirs * 2 + 1,
    );
    if (score !== Infinity) hits.push({ e, score });
  }
  return hits
    .sort((a, b) => a.score - b.score || a.e.order - b.e.order)
    .map(({ e }) => ({ emoji: e.emoji, category: e.category }));
}
