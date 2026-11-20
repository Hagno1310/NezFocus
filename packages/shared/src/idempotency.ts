import { z } from 'zod';

// REQ-MSG-09: every create endpoint except messages (they carry `nonce`) takes this header;
// the backend keeps (user, key) 24 hours and replays the first result. Another body → 40907.
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

// A message `nonce` or an Idempotency-Key: UUIDv4 / ULID from the app, VARCHAR(64).
export const ClientRequestId = z.string().min(1).max(64);
export type ClientRequestId = z.infer<typeof ClientRequestId>;
