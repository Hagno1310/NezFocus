import {
  ErrorCode,
  type MessageAuthor,
  type MessageCreateEvent,
  type MessageResponse,
} from '@nezfocus/shared';
import type { MessageRepository } from '../../domain/messages/MessageRepository';
import { withReaction } from '../../domain/messages/reactions';
import { ApiError } from '../api/client';
import { fakeServerRepository } from '../servers/FakeServerRepository';

const notFound = () =>
  new ApiError(404, { code: ErrorCode.NotFound, message: 'Unknown message' });

// Typing these plays the failures of S-HOME-01 / S-HOME-04.
export const FAKE_REFUSED_TEXT = 'Không gửi được'; // 40302 → failed, "Gửi lại" / "Xóa tin nhắn"
export const FAKE_RATE_LIMITED_TEXT = 'Gửi nhanh quá'; // 40029 → failed, resent after 5 s

const person = (id: string, username: string, name: string): MessageAuthor => ({
  id,
  username,
  display_name: name,
  avatar: null,
});
export const FAKE_AUTHORS = {
  an: person('1', 'an.nguyen', 'An'),
  binh: person('2', 'binh.tran', 'Bình'),
  chi: person('3', 'chi.le', 'Chi'),
  dung: person('4', 'dung.pham', 'Dũng'),
  khanh: person('5', 'khanh.le', 'Khánh'),
};

// Snowflake-like: the id grows with the time, as on the server.
const idAt = (ms: number, seq = 0) =>
  ((BigInt(ms) << 22n) + BigInt(seq)).toString();
let seq = 0;

const message = (
  channelId: string,
  author: MessageAuthor,
  content: string,
  at: Date,
  nonce: string | null = null,
): MessageResponse => ({
  id: idAt(at.getTime(), seq++),
  channel_id: channelId,
  author,
  type: 'default',
  content,
  nonce,
  mention_user_ids: [],
  mention_role_ids: [],
  mention_everyone: false,
  system_data: null,
  reply_to_id: null,
  referenced_message: null,
  reactions: [],
  edited_at: null,
  pinned_at: null,
  created_at: at.toISOString(),
});

const today = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h!, m!, 0, 0);
  return d;
};

// 02 › "Tin mẫu của #hoi-dap", text only, at today's times so it reads like the frames.
const hoiDapSample = (channelId: string) =>
  (
    [
      [
        '20:02',
        FAKE_AUTHORS.binh,
        'Mọi người ơi, câu 3 đề giữa kỳ năm ngoái giải thế nào vậy?',
      ],
      [
        '20:04',
        FAKE_AUTHORS.chi,
        'Đổi sang tọa độ cực rồi tính tích phân kép là ra nhé',
      ],
      [
        '20:05',
        FAKE_AUTHORS.khanh,
        'Bán đề thi giữa kỳ có đáp án 50k, ai cần inbox mình',
      ],
      ['20:06', FAKE_AUTHORS.dung, 'Cảm ơn Chi, mình ra 8π/3 rồi'],
      [
        '20:10',
        FAKE_AUTHORS.binh,
        '@An tối nay 20:30 vào Phòng học im lặng ôn tiếp nhé',
      ],
      ['20:11', FAKE_AUTHORS.an, 'Ok, mình vào sớm giữ chỗ'],
    ] as const
  )
    .map(([time, author, text]) =>
      message(channelId, author, text, today(time)),
    )
    // S-HOME-04 `emoji-picker` frame: Dũng answers Chi, with reactions under it.
    .map((m, i, all) =>
      i === 3
        ? {
            ...m,
            reply_to_id: all[1]!.id,
            referenced_message: {
              id: all[1]!.id,
              author: all[1]!.author,
              content: all[1]!.content,
            },
            reactions: [
              { emoji: '👍', count: 3, me: false },
              { emoji: '🎉', count: 1, me: true },
            ],
          }
        : m,
    );

export const fakeHoiDapId = () =>
  fakeServerRepository.channelId('100', 'hoi-dap');

// The Fake Gateway's MESSAGE_CREATE: Chi answers in #hoi-dap.
export const fakeIncomingMessage = (): MessageCreateEvent | null => {
  const channelId = fakeHoiDapId();
  return channelId
    ? {
        ...message(
          channelId,
          FAKE_AUTHORS.chi,
          'Mình gửi lời giải câu 3 lên #tai-lieu rồi nhé',
          new Date(),
        ),
        server_id: '100',
      }
    : null;
};

export function createFakeMessageRepository(delayMs = 400): MessageRepository {
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  const channels = new Map<string, MessageResponse[]>();
  const of = (channelId: string) => {
    let list = channels.get(channelId);
    if (!list) {
      list = channelId === fakeHoiDapId() ? hoiDapSample(channelId) : [];
      channels.set(channelId, list);
    }
    return list;
  };
  const n = (id: string) => BigInt(id);
  const limited = new Set<string>(); // 40029 once per message, then it goes through

  return {
    async history(channelId, { before, after, limit = 50 }) {
      await wait();
      const list = of(channelId);
      if (before) return list.filter((m) => n(m.id) < n(before)).slice(-limit);
      if (after) return list.filter((m) => n(m.id) > n(after)).slice(0, limit);
      return list.slice(-limit);
    },
    async send(channelId, { content, nonce, reply_to_id }) {
      await wait();
      if (content === FAKE_REFUSED_TEXT)
        throw new ApiError(403, {
          code: ErrorCode.Forbidden,
          message: 'missing permission',
        });
      if (
        content === FAKE_RATE_LIMITED_TEXT &&
        !limited.has(nonce) &&
        limited.add(nonce)
      )
        throw new ApiError(429, {
          code: ErrorCode.RateLimited,
          message: 'slow down',
          retry_after: 5,
        });
      const list = of(channelId);
      const sent = list.find((m) => m.nonce === nonce);
      if (sent) return sent; // MSG-09: same nonce, same message
      const original = list.find((m) => m.id === reply_to_id);
      const created: MessageResponse = {
        ...message(channelId, FAKE_AUTHORS.an, content, new Date(), nonce),
        reply_to_id: reply_to_id ?? null,
        referenced_message: original
          ? {
              id: original.id,
              author: original.author,
              content: original.content,
            }
          : null,
      };
      list.push(created);
      return created;
    },
    // No other device in the Fake: nothing to sync.
    async ack() {},
    async edit(channelId, messageId, content) {
      await wait();
      const list = of(channelId);
      const at = list.findIndex((m) => m.id === messageId);
      if (at < 0) throw notFound();
      const edited = {
        ...list[at]!,
        content,
        edited_at: new Date().toISOString(),
      } as MessageResponse;
      list[at] = edited;
      return edited;
    },
    async remove(channelId, messageId) {
      await wait();
      const list = of(channelId);
      const at = list.findIndex((m) => m.id === messageId);
      if (at < 0) throw notFound();
      list.splice(at, 1);
    },
    async react(channelId, messageId, emoji) {
      await wait();
      const m = of(channelId).find((x) => x.id === messageId);
      if (!m) throw notFound();
      m.reactions = withReaction(m.reactions, emoji, 'add', true);
    },
    async unreact(channelId, messageId, emoji) {
      await wait();
      const m = of(channelId).find((x) => x.id === messageId);
      if (!m) throw notFound();
      m.reactions = withReaction(m.reactions, emoji, 'remove', true);
    },
    async reactionUsers(channelId, messageId, emoji) {
      await wait();
      const r = of(channelId)
        .find((x) => x.id === messageId)
        ?.reactions.find((x) => x.emoji === emoji);
      if (!r) return [];
      const others = [FAKE_AUTHORS.binh, FAKE_AUTHORS.chi, FAKE_AUTHORS.khanh];
      return [
        ...(r.me ? [FAKE_AUTHORS.an] : []),
        ...others.slice(0, r.count - (r.me ? 1 : 0)),
      ];
    },
  };
}

export const fakeMessageRepository = createFakeMessageRepository();
