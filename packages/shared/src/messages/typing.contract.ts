import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';
import { MessageAuthor } from './message.contract.js';

// Paths are relative to /api/v1 (SRS 5.3 Message, DEC-33: typing only over REST).
export const TypingRoutes = {
  // POST REQ-MSG-06: no body · 204 · 40302 (no SEND_MESSAGES), 40303 (DM, P2-B3.2), 40401.
  // A repeat from the same user and channel within TYPING_CLIENT_INTERVAL_MS is 204 and not broadcast.
  start: '/channels/:id/typing',
} as const;

// REQ-MSG-06 / DEC-33: the app calls at most once per 8 s; a line hides 10 s after the last event.
export const TYPING_CLIENT_INTERVAL_MS = 8_000;
export const TYPING_EXPIRE_MS = 10_000;

// SRS 5.4 TYPING_START. `user` carries the name: the app has no member list to look it up.
export const TypingStart = z.object({
  channel_id: SnowflakeId,
  server_id: SnowflakeId.nullable(), // null = DM
  user: MessageAuthor,
  timestamp: z.iso.datetime(),
});
export type TypingStart = z.infer<typeof TypingStart>;
