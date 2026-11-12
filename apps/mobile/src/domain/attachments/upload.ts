import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  ErrorCode,
  type AttachmentPurpose,
} from '@nezfocus/shared';
import { asApiError } from '../auth/authFlow';
import type { AttachmentRepository, ImageFile } from './AttachmentRepository';

// Avatars and server icons share the rules (REQ-AUTH-06, REQ-SRV-01) and the errors of
// 07 S-ME-01 `upload-error`.
export type ImageError = 'type' | 'too-big' | 'network' | 'other';

// AC2 / AC3 before anything is sent: a GIF (Premium, Backlog) or more than 8 MB after the
// phone compressed it.
export function imageFileError(
  file: Pick<ImageFile, 'size' | 'type'>,
): ImageError | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'type';
  if (file.size > AVATAR_MAX_BYTES) return 'too-big';
  return null;
}

export function imageErrorOf(err: unknown): ImageError {
  const api = asApiError(err);
  if (!api) return 'network';
  if (api.code === ErrorCode.UnsupportedFileType) return 'type';
  if (api.code === ErrorCode.FileTooLarge) return 'too-big';
  return 'other';
}

// Ask for an upload URL, PUT the bytes, let the backend read them: the attachment id to set.
export async function uploadImage(
  repo: AttachmentRepository,
  file: ImageFile,
  purpose: AttachmentPurpose,
): Promise<{ ok: true; id: string } | { ok: false; error: ImageError }> {
  const early = imageFileError(file);
  if (early) return { ok: false, error: early };
  try {
    const name = file.uri.split('/').pop() || 'image.jpg';
    const { attachment_id, upload_url } = await repo.create({
      purpose,
      filename: name.slice(-255),
      content_type: file.type,
      size_bytes: file.size,
    });
    await repo.uploadFile(upload_url, file);
    await repo.complete(attachment_id);
    return { ok: true, id: attachment_id };
  } catch (err) {
    return { ok: false, error: imageErrorOf(err) };
  }
}
