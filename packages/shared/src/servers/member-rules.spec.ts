import { describe, expect, it } from 'vitest';
import {
  compareMembers,
  matchesMember,
  memberCursor,
  pageMembers,
  searchKey,
} from './member-rules.js';

const m = (display_name: string | null, username: string) => ({
  user: { display_name, username },
});

describe('searchKey (NFR-I18N-03)', () => {
  it('drops marks and case, "đ" = "d"', () => {
    expect(searchKey('Đỗ Khánh')).toBe('do khanh');
  });
});

describe('compareMembers (S-SET-03, S-HOME-03: by name, Vietnamese order, then username)', () => {
  it('sorts by the Vietnamese alphabet: An, Bình, Chi, Dũng, Đạt', () => {
    const list = [
      m('Đạt', 'dat.ng'),
      m('Dũng', 'dung.pham'),
      m('Chi', 'chi.le'),
      m('An', 'an.nguyen'),
      m('Bình', 'binh.tran'),
    ];
    expect(list.sort(compareMembers).map((x) => x.user.display_name)).toEqual([
      'An',
      'Bình',
      'Chi',
      'Dũng',
      'Đạt',
    ]);
  });

  it('breaks a tie on the name with the username', () => {
    const list = [m('Minh', 'minh.do'), m('Minh', 'minh.anh')];
    expect(list.sort(compareMembers).map((x) => x.user.username)).toEqual([
      'minh.anh',
      'minh.do',
    ]);
  });

  it('uses the username when there is no display name', () => {
    expect(
      compareMembers(m(null, 'an.nguyen'), m('Bình', 'binh')),
    ).toBeLessThan(0);
  });
});

describe('matchesMember (S-SET-03 `search`)', () => {
  it('"kh" finds Khánh by name and by username, without marks', () => {
    expect(matchesMember(m('Khánh', 'khanh.le'), 'kh')).toBe(true);
    expect(matchesMember(m('Lan', 'lan.vu'), 'kh')).toBe(false);
    expect(matchesMember(m('Lan', 'lan.vu'), 'VU')).toBe(true);
  });

  it('an empty query matches everyone', () => {
    expect(matchesMember(m('Lan', 'lan.vu'), '  ')).toBe(true);
  });
});

describe('pageMembers (cursor pagination)', () => {
  const all = ['An', 'Bình', 'Chi', 'Dũng', 'Giang'].map((n) =>
    m(n, n.toLowerCase()),
  );

  it('gives a page and the cursor of its last row', () => {
    const first = pageMembers(all, undefined, 2);
    expect(first.members.map((x) => x.user.display_name)).toEqual([
      'An',
      'Bình',
    ]);
    expect(first.next_cursor).toBe(memberCursor(all[1]!));
    const next = pageMembers(all, first.next_cursor!, 2);
    expect(next.members.map((x) => x.user.display_name)).toEqual([
      'Chi',
      'Dũng',
    ]);
    expect(pageMembers(all, next.next_cursor!, 2)).toEqual({
      members: [all[4]],
      next_cursor: null,
    });
  });

  it('a row that left between pages does not shift the next page', () => {
    const first = pageMembers(all, undefined, 2);
    const without = all.filter((x) => x.user.display_name !== 'Bình');
    expect(
      pageMembers(without, first.next_cursor!, 2).members.map(
        (x) => x.user.display_name,
      ),
    ).toEqual(['Chi', 'Dũng']);
  });

  it('a cursor that is not ours starts from the top', () => {
    expect(pageMembers(all, 'rác', 1).members).toEqual([all[0]]);
  });
});
