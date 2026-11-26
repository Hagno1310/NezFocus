import { describe, expect, it } from 'vitest';
import {
  activeTrigger,
  decodeMentions,
  concernsMe,
  encodeMentions,
  insertMention,
  suggestChannels,
  suggestMentions,
} from './mentions';

const member = (id: string, name: string, username: string) => ({
  user: { id, display_name: name, username, avatar: null },
  role_ids: [],
  joined_at: '2026-10-01T00:00:00Z',
  timeout_until: null,
});

// Dữ liệu mẫu 02: Bình, Chi, Dũng, Hà, Khánh online; Mai offline; An is me.
const members = [
  member('1', 'An', 'an.nguyen'),
  member('2', 'Bình', 'binh.tran'),
  member('3', 'Chi', 'chi.le'),
  member('4', 'Dũng', 'dung.pham'),
  member('5', 'Hà', 'ha.nguyen'),
  member('6', 'Khánh', 'khanh.le'),
  member('7', 'Mai', 'mai.tran'),
];
const online = (id: string) => id !== '7';
const roles = [
  { id: '100', name: '@everyone', mentionable: false, count: 24 },
  { id: '21', name: 'Trưởng nhóm', mentionable: true, count: 2 },
  { id: '22', name: 'Quản trị', mentionable: false, count: 1 },
];

describe('activeTrigger', () => {
  it('finds the @ or # being typed at the cursor', () => {
    expect(activeTrigger('chào @tr', 8)).toEqual({
      kind: '@',
      query: 'tr',
      start: 5,
    });
    expect(activeTrigger('#', 1)).toEqual({ kind: '#', query: '', start: 0 });
  });
  it('none inside a word or after a space', () => {
    expect(activeTrigger('an@gmail', 8)).toBeNull();
    expect(activeTrigger('@tr ', 4)).toBeNull();
  });
});

describe('REQ-MSG-03 suggestMentions (C-27)', () => {
  const base = {
    members,
    online,
    myId: '1',
    roles,
    serverId: '100',
    withRoles: true,
  };

  it('`mention-suggest`: online first, then by name, never me', () => {
    const [group] = suggestMentions({
      ...base,
      query: '',
      canMentionEveryone: false,
    });
    expect(group!.title).toBe('members');
    expect(group!.items.map((s) => s.name)).toEqual([
      'Bình',
      'Chi',
      'Dũng',
      'Hà',
      'Khánh',
      'Mai',
    ]);
  });

  it('AC6 `mention-suggest-roles`: "@tr" → Bình, Mai by username; every role but @everyone with MENTION_EVERYONE', () => {
    const groups = suggestMentions({
      ...base,
      query: 'tr',
      canMentionEveryone: true,
    });
    expect(groups.map((g) => [g.title, g.items.map((s) => s.name)])).toEqual([
      ['members', ['Bình', 'Mai']],
      ['roles', ['Trưởng nhóm', 'Quản trị']],
    ]);
    const all = suggestMentions({
      ...base,
      query: '',
      canMentionEveryone: true,
    });
    expect(all[1]!.items.map((s) => s.name)).toEqual([
      'Trưởng nhóm',
      'Quản trị',
    ]);
    expect(all[2]!.items.map((s) => s.name)).toEqual(['@everyone', '@here']);
  });

  it('without MENTION_EVERYONE: mentionable roles only, no @everyone / @here', () => {
    const groups = suggestMentions({
      ...base,
      query: '',
      canMentionEveryone: false,
    });
    expect(groups.map((g) => g.title)).toEqual(['members', 'roles']);
    expect(groups[1]!.items.map((s) => s.name)).toEqual(['Trưởng nhóm']);
  });

  it('accents ignored, start of a word only; a DM has no roles', () => {
    expect(
      suggestMentions({
        ...base,
        query: 'dung',
        canMentionEveryone: true,
        withRoles: false,
      }).map((g) => g.items.map((s) => s.name)),
    ).toEqual([['Dũng']]);
    expect(
      suggestMentions({ ...base, query: 'anh', canMentionEveryone: false }),
    ).toEqual([]); // "Khánh" has "anh" inside, not at a start
  });
});

describe('suggestChannels', () => {
  it('text channels whose name starts a word with the query', () => {
    const chans = [
      { id: 'c1', name: 'tai-lieu', type: 'text' as const },
      { id: 'c2', name: 'hoi-dap', type: 'text' as const },
      { id: 'v', name: 'Phòng học', type: 'voice' as const },
    ];
    expect(suggestChannels('lie', chans).map((c) => c.name)).toEqual([
      'tai-lieu',
    ]);
    expect(suggestChannels('', chans)).toHaveLength(2);
  });
});

describe('insertMention / encodeMentions', () => {
  it('replaces the typed trigger with the label and a space', () => {
    expect(
      insertMention(
        'chào @bi',
        { kind: '@', query: 'bi', start: 5 },
        8,
        '@Bình',
      ),
    ).toEqual({ text: 'chào @Bình ', cursor: 11 });
  });

  it('turns picked labels into tokens, longest first, whole names only', () => {
    expect(
      encodeMentions('@Bình và @Trưởng nhóm, @Bìnhxyz ơi', [
        { label: '@Bình', token: '<@2>' },
        { label: '@Trưởng nhóm', token: '<@&21>' },
      ]),
    ).toBe('<@2> và <@&21>, @Bìnhxyz ơi');
  });
});

describe('concernsMe (CR-12)', () => {
  const msg = {
    type: 'default' as const,
    author: { id: '2' },
    mention_user_ids: [] as string[],
    mention_role_ids: [] as string[],
    mention_everyone: false,
  };
  it('me, my role, or everyone; never my own message', () => {
    expect(concernsMe({ ...msg, mention_user_ids: ['1'] }, '1', [])).toBe(true);
    expect(concernsMe({ ...msg, mention_role_ids: ['21'] }, '1', ['21'])).toBe(
      true,
    );
    expect(concernsMe({ ...msg, mention_everyone: true }, '1', [])).toBe(true);
    expect(concernsMe(msg, '1', [])).toBe(false);
    expect(
      concernsMe(
        { ...msg, author: { id: '1' }, mention_everyone: true },
        '1',
        [],
      ),
    ).toBe(false);
  });
});

describe('decodeMentions (S-HOME-01 edit-mode)', () => {
  it('shows tokens as labels and gives them back to encodeMentions', () => {
    const label = (n: { kind: string; id: string }) =>
      n.kind === 'user'
        ? '@Bình'
        : n.kind === 'role'
          ? '@Trưởng nhóm'
          : '#tai-lieu';
    const { text, picked } = decodeMentions('<@2> xem <#9> nhé <@&5>', label);
    expect(text).toBe('@Bình xem #tai-lieu nhé @Trưởng nhóm');
    expect(encodeMentions(text, picked)).toBe('<@2> xem <#9> nhé <@&5>');
  });
});
