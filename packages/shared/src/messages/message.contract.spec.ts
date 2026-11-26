import { describe, expect, it } from 'vitest';
import {
  CreateMessageRequest,
  EditMessageRequest,
  isReactionEmoji,
  MESSAGE_MAX_CHARS,
  MessageResponse,
  MessageHistoryQuery,
  countMessageChars,
  mentionToken,
  messageTypeCode,
  parseMentions,
} from './message.contract.js';

describe('countMessageChars (REQ-MSG-01 v1.9)', () => {
  it('counts precomposed and combining Vietnamese the same', () => {
    const precomposed = 'Tiếng Việt';
    const combining = precomposed.normalize('NFD');
    expect(combining.length).toBeGreaterThan(precomposed.length);
    expect(countMessageChars(combining)).toBe(countMessageChars(precomposed));
    expect(countMessageChars(precomposed)).toBe(10);
  });

  it('counts code points, so a joined emoji is several', () => {
    expect(countMessageChars('😀')).toBe(1);
    expect(countMessageChars('👨‍👩‍👧')).toBe(5);
  });
});

describe('CreateMessageRequest', () => {
  const nonce = '0b8f1c2e-4a5d-4e6f-8a7b-9c0d1e2f3a4b';

  it('takes 2000 characters and refuses 2001 (MSG-01 AC3)', () => {
    expect(
      CreateMessageRequest.safeParse({ content: 'a'.repeat(2000), nonce })
        .success,
    ).toBe(true);
    expect(
      CreateMessageRequest.safeParse({
        content: 'a'.repeat(MESSAGE_MAX_CHARS + 1),
        nonce,
      }).success,
    ).toBe(false);
  });

  it('counts after NFC, so 2000 combining Vietnamese letters still pass', () => {
    const content = 'ệ'.repeat(2000).normalize('NFD');
    const parsed = CreateMessageRequest.parse({ content, nonce });
    expect(parsed.content).toBe('ệ'.repeat(2000));
  });

  it('refuses empty and whitespace-only content (MSG-01 AC2)', () => {
    for (const content of ['', '   ', '\n\t '])
      expect(CreateMessageRequest.safeParse({ content, nonce }).success).toBe(
        false,
      );
  });

  it('needs a nonce of 1–64 characters (MSG-09)', () => {
    expect(
      CreateMessageRequest.safeParse({ content: 'hi', nonce: '' }).success,
    ).toBe(false);
    expect(
      CreateMessageRequest.safeParse({ content: 'hi', nonce: 'x'.repeat(65) })
        .success,
    ).toBe(false);
    expect(
      CreateMessageRequest.safeParse({ content: 'hi', nonce: '01JD6Z' })
        .success,
    ).toBe(true);
  });
});

describe('MessageHistoryQuery (REQ-SEARCH-02)', () => {
  it('defaults limit to 50 and reads it from a query string', () => {
    expect(MessageHistoryQuery.parse({})).toEqual({ limit: 50 });
    expect(MessageHistoryQuery.parse({ before: '123', limit: '20' })).toEqual({
      before: '123',
      limit: 20,
    });
  });

  it('refuses limit=500 (AC2) and anything outside 1–100', () => {
    for (const limit of ['500', '0', '101', '1.5', '0x10', '1e2', ' 5', ''])
      expect(MessageHistoryQuery.safeParse({ limit }).success).toBe(false);
  });

  it('takes at most one of before / after / around', () => {
    expect(
      MessageHistoryQuery.safeParse({ before: '1', after: '2' }).success,
    ).toBe(false);
    expect(
      MessageHistoryQuery.safeParse({ after: '1', around: '2' }).success,
    ).toBe(false);
  });
});

describe('MessageResponse', () => {
  const base = {
    id: '1300000000000000001',
    channel_id: '1200000000000000001',
    author: {
      id: '1100000000000000001',
      username: 'binh.tran',
      display_name: 'Bình',
      avatar: null,
    },
    content: '',
    nonce: null,
    mention_user_ids: [],
    mention_role_ids: [],
    mention_everyone: false,
    reply_to_id: null,
    edited_at: null,
    pinned_at: null,
    created_at: '2026-10-18T13:02:00.000Z',
  };

  it('carries system_data matching its type (MSG-11)', () => {
    expect(
      MessageResponse.safeParse({
        ...base,
        type: 'member_join',
        system_data: { user_id: '1100000000000000002' },
      }).success,
    ).toBe(true);
    expect(
      MessageResponse.safeParse({
        ...base,
        type: 'member_join',
        system_data: null,
      }).success,
    ).toBe(false);
    expect(
      MessageResponse.safeParse({ ...base, type: 'default', system_data: null })
        .success,
    ).toBe(true);
  });

  it('maps each type to its SRS 8.2.1 number', () => {
    expect(messageTypeCode.default).toBe(0);
    expect(messageTypeCode.member_join).toBe(1);
    expect(messageTypeCode.study_event_end).toBe(11);
  });
});

describe('mention tokens (REQ-MSG-03, read by P2-A4.1)', () => {
  it('writes and reads user, role and channel tokens', () => {
    const text = `${mentionToken.user('11')} hỏi ${mentionToken.role('22')} ở ${mentionToken.channel('33')} @everyone`;
    expect(text).toBe('<@11> hỏi <@&22> ở <#33> @everyone');
    expect(parseMentions(text)).toEqual({
      mention_user_ids: ['11'],
      mention_role_ids: ['22'],
      mention_channel_ids: ['33'],
      mention_everyone: true,
      mention_here: false,
    });
  });

  it('dedupes and ignores look-alikes', () => {
    expect(parseMentions('<@1> <@1> <@x> email@here.com @here')).toEqual({
      mention_user_ids: ['1'],
      mention_role_ids: [],
      mention_channel_ids: [],
      mention_everyone: false,
      mention_here: true,
    });
  });
});

describe('isReactionEmoji (REQ-MSG-05)', () => {
  it('takes one emoji, joined sequences, skin tones, flags and keycaps', () => {
    for (const e of ['👍', '❤️', '😂', '👨‍👩‍👧', '👍🏽', '🇻🇳', '1️⃣', '🏳️‍🌈'])
      expect(isReactionEmoji(e)).toBe(true);
  });

  it('refuses text, two emoji, blanks and padding', () => {
    for (const e of ['', 'a', '1', ' 👍', '👍👍', '🇻', '🇻🇳🇺🇸', 'ok👍'])
      expect(isReactionEmoji(e)).toBe(false);
  });
});

describe('EditMessageRequest', () => {
  it('saves NFC and refuses blank content (S-HOME-01 edit-mode)', () => {
    expect(
      EditMessageRequest.parse({ content: 'Giải tích'.normalize('NFD') })
        .content,
    ).toBe('Giải tích');
    expect(EditMessageRequest.safeParse({ content: '  ' }).success).toBe(false);
  });
});

describe('CreateMessageRequest reply_to_id', () => {
  it('takes a snowflake and nothing else', () => {
    const base = { content: 'ừ', nonce: 'n-1' };
    expect(
      CreateMessageRequest.parse({ ...base, reply_to_id: '42' }).reply_to_id,
    ).toBe('42');
    expect(
      CreateMessageRequest.safeParse({ ...base, reply_to_id: 'abc' }).success,
    ).toBe(false);
  });
});

describe('CreateMessageRequest attachment_ids (REQ-MSG-04)', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1));

  it('sends images with no text (MSG-01 AC2: "empty and no file")', () => {
    const body = CreateMessageRequest.parse({
      content: '',
      nonce: 'n-1',
      attachment_ids: ['7'],
    });
    expect(body.attachment_ids).toEqual(['7']);
    expect(
      CreateMessageRequest.safeParse({
        content: ' ',
        nonce: 'n-1',
        attachment_ids: [],
      }).success,
    ).toBe(false);
  });

  it('takes at most 10, each once', () => {
    const base = { content: 'ảnh', nonce: 'n-1' };
    expect(
      CreateMessageRequest.safeParse({ ...base, attachment_ids: ids(10) })
        .success,
    ).toBe(true);
    expect(
      CreateMessageRequest.safeParse({ ...base, attachment_ids: ids(11) })
        .success,
    ).toBe(false);
    expect(
      CreateMessageRequest.safeParse({ ...base, attachment_ids: ['7', '7'] })
        .success,
    ).toBe(false);
  });
});

describe('MessageResponse attachments and pins', () => {
  const base = {
    id: '1300000000000000001',
    channel_id: '1200000000000000001',
    author: { id: '1', username: 'chi.le', display_name: 'Chi', avatar: null },
    content: '',
    nonce: null,
    mention_user_ids: [],
    mention_role_ids: [],
    mention_everyone: false,
    reply_to_id: null,
    edited_at: null,
    pinned_at: null,
    created_at: '2026-10-18T12:30:00.000Z',
  };

  it('defaults attachments to none, so cached messages from before still parse', () => {
    const m = MessageResponse.parse({
      ...base,
      type: 'default',
      system_data: null,
    });
    expect(m.attachments).toEqual([]);
  });

  it('a pin is a channel_pinned system message pointing at the pinned one (MSG-10, MSG-11)', () => {
    expect(
      MessageResponse.safeParse({
        ...base,
        type: 'channel_pinned',
        system_data: { message_id: '1300000000000000000' },
      }).success,
    ).toBe(true);
    expect(
      MessageResponse.safeParse({
        ...base,
        type: 'channel_pinned',
        system_data: null,
      }).success,
    ).toBe(false);
  });
});
