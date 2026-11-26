import { describe, expect, it } from 'vitest';
import {
  emojiIndex,
  foldText,
  searchEmoji,
  type EmojiRow,
} from './emojiSearch';

const rows: EmojiRow[] = [
  [
    '😂',
    0,
    'face with tears of joy',
    'face,joy,laugh,tear',
    'mặt cười ra nước mắt',
    'cười,mặt,nước mắt,vui',
  ],
  [
    '❤️',
    6,
    'red heart',
    'heart',
    'trái tim màu đỏ',
    'cảm xúc,trái tim,tình yêu',
  ],
  ['🔥', 5, 'fire', 'flame,tool', 'lửa', 'dụng cụ,ngọn lửa'],
  [
    '💙',
    6,
    'blue heart',
    'blue,heart',
    'trái tim màu xanh dương',
    'trái tim,xanh dương',
  ],
  ['🧡', 6, 'orange heart', 'heart,orange', 'trái tim màu cam', 'cam,trái tim'],
];
const index = emojiIndex(rows);
const find = (q: string, lang: 'vi' | 'en' = 'vi') =>
  searchEmoji(index, q, lang).map((e) => e.emoji);

// C-25, chốt 26/11/2026: both languages whatever the app's, no diacritics needed.
describe('searchEmoji', () => {
  it('folds case, diacritics and đ', () => {
    expect(foldText('Đỏ CƯỜI')).toBe('do cuoi');
  });

  it('finds by Vietnamese or English in either app language', () => {
    expect(find('cuoi')).toEqual(['😂']);
    expect(find('fire', 'vi')).toEqual(['🔥']);
    expect(find('lửa', 'en')).toEqual(['🔥']);
  });

  it('a name match beats a keyword match; ties put the app language first', () => {
    // "tim": the name of every heart in vi; "heart" for en is a name word too.
    expect(find('tim')).toEqual(['❤️', '💙', '🧡']);
    // "cam": name of 🧡 in vi ("màu cam") ranks above its keyword in nothing else.
    expect(find('cam')).toEqual(['🧡', '❤️']);
    // "orange": en name word of 🧡; in a vi app still found.
    expect(find('orange', 'vi')).toEqual(['🧡']);
  });

  it('matches the start of a word, not the middle; blank finds nothing', () => {
    expect(find('ear')).toEqual([]);
    expect(find('  ')).toEqual([]);
    expect(find('trai tim mau d')).toEqual(['❤️']);
  });
});
