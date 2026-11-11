import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';

// SRS 5.3 Upload: ask for a presigned URL, PUT the bytes there, then `complete` so the
// backend reads the real content. Paths are relative to /api/v1.
export const AttachmentRoutes = {
  // bearer · CreateAttachmentRequest → 201 AttachmentUploadResponse · 40001,
  // 40013 (too big for the purpose), 40014 (type the purpose does not take)
  create: '/attachments',
  // bearer · → 200 AttachmentResponse · 40013, 40014 (by the bytes, not the declared type;
  // the file is deleted), 40401 (not yours, or nothing uploaded yet)
  complete: '/attachments/:id/complete',
} as const;

// ponytail: `server_icon` with P1-A4.7 (#211), `message` with REQ-MSG-04 P3-A2.1 (#123).
export const AttachmentPurpose = z.enum(['avatar']);
export type AttachmentPurpose = z.infer<typeof AttachmentPurpose>;

// REQ-AUTH-06: still images only (GIF avatars are Premium, Backlog), at most 8MB.
export const AVATAR_MAX_BYTES = 8 * 1024 * 1024;
export const AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

// POST /attachments
export const CreateAttachmentRequest = z.object({
  purpose: AttachmentPurpose,
  filename: z.string().trim().min(1).max(255),
  content_type: z.string().trim().toLowerCase().min(1).max(100),
  size_bytes: z.number().int().positive(),
});
export type CreateAttachmentRequest = z.infer<typeof CreateAttachmentRequest>;

export const AttachmentUploadResponse = z.object({
  attachment_id: SnowflakeId,
  upload_url: z.string(), // PUT the bytes with the same Content-Type and Content-Length
  expires_at: z.iso.datetime(),
});
export type AttachmentUploadResponse = z.infer<typeof AttachmentUploadResponse>;

// POST /attachments/{id}/complete
export const AttachmentResponse = z.object({
  id: SnowflakeId,
  purpose: AttachmentPurpose,
  content_type: z.string(), // from the bytes
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
});
export type AttachmentResponse = z.infer<typeof AttachmentResponse>;
