import { z } from 'zod';

// REQ-MSG-09: every create endpoint except messages (they carry `nonce`) takes this header;
// the backend keeps (user, key) 24 hours and replays the first result. Another body → 40907.
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
export const IdempotencyKey = z.string().min(1).max(64); // UUIDv4 / ULID from the app
export type IdempotencyKey = z.infer<typeof IdempotencyKey>;
