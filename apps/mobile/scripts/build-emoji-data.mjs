// C-25 EmojiPicker data (chốt 26/11/2026): one small file with every emoji's English and
// Vietnamese names and keywords, so search works in both languages whatever the app's.
// Run after bumping emojibase-data: node apps/mobile/scripts/build-emoji-data.mjs
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const en = require('emojibase-data/en/data.json');
const vi = require('emojibase-data/vi/data.json');

// Android 13 draws emoji 14 with its system font; newer ones would show as boxes.
const MAX_VERSION = 14;
// Frame S-HOME-04 `emoji-picker` category bar: smile, cat, apple, volleyball, car, lightbulb,
// heart. emojibase groups: 0 smileys, 1 people, 3 animals, 4 food, 5 travel, 6 activities,
// 7 objects, 8 symbols, 9 flags (2 = skin tone parts, left out).
const CATEGORY = { 0: 0, 1: 0, 3: 1, 4: 2, 6: 3, 5: 4, 7: 5, 8: 6, 9: 6 };

const viBy = new Map(vi.map((e) => [e.hexcode, e]));
const rows = en
  .filter(
    (e) => CATEGORY[e.group] !== undefined && (e.version ?? 0) <= MAX_VERSION,
  )
  .sort((a, b) => CATEGORY[a.group] - CATEGORY[b.group] || a.order - b.order)
  .map((e) => {
    const v = viBy.get(e.hexcode);
    return [
      e.emoji,
      CATEGORY[e.group],
      e.label,
      (e.tags ?? []).join(','),
      v?.label ?? '',
      (v?.tags ?? []).join(','),
    ];
  });

const out = new URL('../src/shared/emoji/emojiData.json', import.meta.url);
writeFileSync(out, JSON.stringify(rows));
console.log(`${rows.length} emoji → ${out.pathname}`);
