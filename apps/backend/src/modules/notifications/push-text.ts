import type { Locale } from '@nezfocus/shared';

// Characters of the message a push shows: Android shows a few lines, and 300 accented
// characters stay far under the 4KB of SRS 5.6.
export const BODY_MAX = 300;

export type PushNames = {
  users: ReadonlyMap<string, string>;
  roles: ReadonlyMap<string, string>;
  channels: ReadonlyMap<string, string>;
};

export type PushSubject =
  | {
      type: 'mention';
      actor: string;
      channel: string;
      via: 'user' | 'everyone' | 'here' | 'role';
      role?: string;
      body: string;
    }
  | { type: 'reply'; actor: string; channel: string; body: string }
  | { type: 'dm'; actor: string; body: string }
  | {
      type: 'friend_request';
      actor: string;
      username: string;
      note: string | null;
    }
  | { type: 'owner_transferred'; actor: string; server: string };

// SRS 5.6 (CR-28 #36): the inbox wording of spec 06; names are data, never translated.
const TEXT = {
  vi: {
    mentionYou: (a: string, c: string) => `${a} nhắc tới bạn ở #${c}`,
    mentionOf: (a: string, who: string, c: string) =>
      `${a} nhắc tới @${who} ở #${c}`,
    reply: (a: string, c: string) => `${a} trả lời bạn ở #${c}`,
    friendRequest: (a: string) => `${a} muốn kết bạn`,
    ownerTransferred: (a: string, s: string) =>
      `${a} đã chuyển quyền Owner của ${s} cho bạn`,
    image: 'Đã gửi ảnh',
    unknown: 'Không rõ',
  },
  en: {
    mentionYou: (a: string, c: string) => `${a} mentioned you in #${c}`,
    mentionOf: (a: string, who: string, c: string) =>
      `${a} mentioned @${who} in #${c}`,
    reply: (a: string, c: string) => `${a} replied to you in #${c}`,
    friendRequest: (a: string) => `${a} wants to be friends`,
    ownerTransferred: (a: string, s: string) =>
      `${a} made you the Owner of ${s}`,
    image: 'Sent an image',
    unknown: 'Unknown',
  },
} as const;

export function pushText(subject: PushSubject, locale: Locale) {
  const t = TEXT[locale];
  switch (subject.type) {
    case 'mention': {
      const { actor, channel, via } = subject;
      const title =
        via === 'user'
          ? t.mentionYou(actor, channel)
          : t.mentionOf(
              actor,
              via === 'role' ? (subject.role ?? t.unknown) : via,
              channel,
            );
      return { title, body: subject.body };
    }
    case 'reply':
      return {
        title: t.reply(subject.actor, subject.channel),
        body: subject.body,
      };
    case 'dm':
      return { title: subject.actor, body: subject.body };
    case 'friend_request':
      return {
        title: t.friendRequest(subject.actor),
        body: subject.note ?? subject.username,
      };
    // Spec 06 `owner_transferred`: the item's sentence; its source line is the server.
    case 'owner_transferred':
      return {
        title: t.ownerTransferred(subject.actor, subject.server),
        body: subject.server,
      };
  }
}

const TOKEN = /<@(\d{1,20})>|<@&(\d{1,20})>|<#(\d{1,20})>/g;

export function messageBody(
  content: string,
  images: number,
  names: PushNames,
  locale: Locale,
) {
  const unknown = TEXT[locale].unknown;
  const text = content
    .replace(TOKEN, (_, user?: string, role?: string, channel?: string) => {
      if (user) return `@${names.users.get(user) ?? unknown}`;
      if (role) return `@${names.roles.get(role) ?? unknown}`;
      return `#${names.channels.get(channel ?? '') ?? unknown}`;
    })
    .trim();
  if (!text) return images ? TEXT[locale].image : '';
  const chars = [...text]; // code points: an emoji is never cut in half
  return chars.length <= BODY_MAX
    ? text
    : chars.slice(0, BODY_MAX - 1).join('') + '…';
}
