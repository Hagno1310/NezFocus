import { AVATAR_MAX_BYTES, AVATAR_TYPES, ErrorCode } from '@nezfocus/shared';
import type { AttachmentRepository } from '../../domain/attachments/AttachmentRepository';
import { ApiError } from '../api/client';

// EXPO_PUBLIC_FAKE=attachments: nothing leaves the phone; a completed upload is the local
// file, which the other fakes (account, servers) hand back as the image URL.
const uploaded = new Map<string, string>(); // attachment id → local file

export const fakeUploadedUri = (id: string) => uploaded.get(id);

const fail = (status: number, code: number) =>
  new ApiError(status, { code, message: `fake ${code}` });

export function createFakeAttachmentRepository(
  delayMs = 300,
): AttachmentRepository {
  const wait = () => new Promise((r) => setTimeout(r, delayMs));
  let nextId = 900;
  const pending = new Map<string, string>();
  return {
    async create(body) {
      await wait();
      if (body.size_bytes > AVATAR_MAX_BYTES)
        throw fail(413, ErrorCode.FileTooLarge);
      if (!(AVATAR_TYPES as readonly string[]).includes(body.content_type))
        throw fail(415, ErrorCode.UnsupportedFileType);
      nextId += 1;
      return {
        attachment_id: String(nextId),
        upload_url: `fake://upload/${nextId}`,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      };
    },
    async uploadFile(url, file) {
      await wait();
      pending.set(url.split('/').pop()!, file.uri);
    },
    async complete(id) {
      await wait();
      const uri = pending.get(id);
      if (!uri) throw fail(404, ErrorCode.NotFound);
      uploaded.set(id, uri);
      return {
        id,
        purpose: 'avatar',
        content_type: 'image/jpeg',
        width: 512,
        height: 512,
      };
    },
  };
}

export const fakeAttachmentRepository = createFakeAttachmentRepository();
