import { z } from 'zod';
import { SnowflakeId } from '../snowflake.js';

// SRS 5.3 Upload: ask for a presigned URL, PUT the bytes there, then `complete` so the
// backend reads the real content. Paths are relative to /api/v1.
export const AttachmentRoutes = {
  // bearer · CreateAttachmentRequest → 201 AttachmentUploadResponse · 40001,
  // 40013 (too big for the purpose), 40014 (type the purpose does not take); `message`:
  // 40302 (no ATTACH_FILES / cannot send), 40303 (DM), 40401 (channel not viewable)
  create: '/attachments',
  // bearer · → 200 AttachmentResponse · 40013, 40014 (by the bytes, not the declared type;
  // the file is deleted), 40401 (not yours, or nothing uploaded yet)
  complete: '/attachments/:id/complete',
  // CR-28 #29 · bearer · GET → 302 to a short-lived signed URL · 40401 (not on a message the
  // caller can view). `:variant` = original | thumbnail. MessageAttachment carries both paths.
  file: '/attachments/:id/:variant',
} as const;

export const ATTACHMENT_VARIANTS = ['original', 'thumbnail'] as const;
export type AttachmentVariant = (typeof ATTACHMENT_VARIANTS)[number];
export const attachmentFilePath = (id: string, variant: AttachmentVariant) =>
  AttachmentRoutes.file.replace(':id', id).replace(':variant', variant);

// `server_icon` (REQ-SRV-01) takes the avatar rules below; `message` (REQ-MSG-04) its own.
export const AttachmentPurpose = z.enum(['avatar', 'server_icon', 'message']);
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

// REQ-MSG-04 (CR-28): MVP sends images only, ≤ 25MB each, ≤ 10 per message. HEIC is turned
// into JPEG on the phone, so it is not taken here.
export const MESSAGE_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
export const MESSAGE_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

// POST /attachments. A message file belongs to one channel (SRS 8.2 attachments.channel_id).
export const CreateAttachmentRequest = z
  .object({
    purpose: AttachmentPurpose,
    channel_id: SnowflakeId.optional(),
    filename: z.string().trim().min(1).max(255),
    content_type: z.string().trim().toLowerCase().min(1).max(100),
    size_bytes: z.number().int().positive(),
  })
  .refine((b) => (b.purpose === 'message') === (b.channel_id !== undefined), {
    message: 'channel_id is required for a message file, and only for one',
    path: ['channel_id'],
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

// An image of a message (REQ-MSG-04). `url` / `thumbnail_url`: paths relative to /api/v1,
// read with the bearer (CR-28 #29); they never change, so the app may cache the bytes.
export const MessageAttachment = z.object({
  id: SnowflakeId,
  filename: z.string(),
  content_type: z.string(),
  size_bytes: z.number().int(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  url: z.string(),
  thumbnail_url: z.string(),
});
export type MessageAttachment = z.infer<typeof MessageAttachment>;
