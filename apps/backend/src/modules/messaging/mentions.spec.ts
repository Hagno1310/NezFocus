import { allowedMentions, mentionRecipients } from './mentions.js';

describe('REQ-MSG-03 allowedMentions', () => {
  const parsed = {
    mention_user_ids: ['7'],
    mention_role_ids: ['21', '22', '100'],
    mention_channel_ids: [],
    mention_everyone: true,
    mention_here: false,
  };
  const roles = [
    { id: '21', mentionable: true },
    { id: '22', mentionable: false },
    { id: '100', mentionable: true }, // @everyone (id = server id) is never a role mention
  ];

  it('AC1: no MENTION_EVERYONE → @everyone stays text, only mentionable roles count', () => {
    expect(
      allowedMentions(parsed, {
        serverId: '100',
        roles,
        canMentionEveryone: false,
      }),
    ).toEqual({ roleIds: ['21'], everyone: false });
  });

  it('MENTION_EVERYONE → every role but @everyone, and @everyone / @here', () => {
    expect(
      allowedMentions(
        { ...parsed, mention_everyone: false, mention_here: true },
        { serverId: '100', roles, canMentionEveryone: true },
      ),
    ).toEqual({ roleIds: ['21', '22'], everyone: true });
  });

  it('a role of another server is ignored', () => {
    expect(
      allowedMentions(
        { ...parsed, mention_role_ids: ['99'] },
        { serverId: '100', roles, canMentionEveryone: true },
      ).roleIds,
    ).toEqual([]);
  });
});

describe('REQ-MSG-03 mentionRecipients', () => {
  it('one entry per person, by the most direct way, never the sender', () => {
    const got = mentionRecipients({
      authorId: '1',
      userIds: ['2', '1'],
      roleMembers: [
        { roleId: '21', userId: '2' },
        { roleId: '21', userId: '3' },
        { roleId: '22', userId: '3' },
      ],
      everyoneIds: ['1', '2', '3', '4'],
      everyoneVia: 'everyone',
    });
    expect(Object.fromEntries(got)).toEqual({
      '2': { via: 'user' },
      '3': { via: 'role', role_id: '21' },
      '4': { via: 'everyone' },
    });
  });

  it('@here keeps its own via', () => {
    const got = mentionRecipients({
      authorId: '1',
      userIds: [],
      roleMembers: [],
      everyoneIds: ['5'],
      everyoneVia: 'here',
    });
    expect(got.get('5')).toEqual({ via: 'here' });
  });
  // CR-12 / MSG-03 AC3, AC4: a reply to my message concerns me unless I am also mentioned.
  it('the replied author joins as `reply`, after any mention, never the sender', () => {
    const base = {
      roleMembers: [],
      everyoneIds: [],
      everyoneVia: 'here' as const,
    };
    expect(
      mentionRecipients({
        ...base,
        authorId: '1',
        userIds: [],
        replyAuthorId: '2',
      }).get('2'),
    ).toEqual({ via: 'reply' });
    expect(
      mentionRecipients({
        ...base,
        authorId: '1',
        userIds: ['2'],
        replyAuthorId: '2',
      }).get('2'),
    ).toEqual({ via: 'user' });
    expect(
      mentionRecipients({
        ...base,
        authorId: '1',
        userIds: [],
        replyAuthorId: '1',
      }).size,
    ).toBe(0);
  });
});
