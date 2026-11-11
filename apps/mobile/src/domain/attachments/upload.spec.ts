import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import type { AttachmentRepository } from './AttachmentRepository';
import { imageFileError, uploadImage } from './upload';

const apiError = (code: number) => Object.assign(new Error('x'), { code });
const file = { uri: 'file:///a.jpg', size: 80_000, type: 'image/jpeg' };
const repo = (over: Partial<AttachmentRepository>): AttachmentRepository => ({
  create: async () => ({
    attachment_id: '9',
    upload_url: 'http://s3/put',
    expires_at: '2026-10-18T13:30:00.000Z',
  }),
  uploadFile: async () => {},
  complete: async (id) => ({
    id,
    purpose: 'avatar',
    content_type: 'image/jpeg',
    width: 512,
    height: 512,
  }),
  ...over,
});

describe('uploadImage (SRS 5.3, AUTH-06 AC1–AC4, SRV-01 icon)', () => {
  it('AC2 / AC3: a GIF or more than 8 MB is refused before anything is sent', () => {
    expect(imageFileError({ ...file, type: 'image/gif' })).toBe('type');
    expect(imageFileError({ ...file, size: 9 * 1024 * 1024 })).toBe('too-big');
    expect(imageFileError(file)).toBeNull();
  });

  it('create (with the purpose) → PUT → complete, then the id to set', async () => {
    const calls: string[] = [];
    const r = await uploadImage(
      repo({
        create: async (b) => {
          calls.push(`create ${b.purpose} ${b.content_type} ${b.size_bytes}`);
          return {
            attachment_id: '9',
            upload_url: 'http://s3/put',
            expires_at: '2026-10-18T13:30:00.000Z',
          };
        },
        uploadFile: async (url) => void calls.push(`put ${url}`),
        complete: async (id) => {
          calls.push(`complete ${id}`);
          return {
            id,
            purpose: 'server_icon',
            content_type: 'image/jpeg',
            width: 512,
            height: 512,
          };
        },
      }),
      file,
      'server_icon',
    );
    expect(r).toEqual({ ok: true, id: '9' });
    expect(calls).toEqual([
      'create server_icon image/jpeg 80000',
      'put http://s3/put',
      'complete 9',
    ]);
  });

  it('40014 / 40013 from the backend; a lost request is network', async () => {
    const failing = (err: unknown) =>
      uploadImage(
        repo({ complete: () => Promise.reject(err) }),
        file,
        'avatar',
      );
    await expect(
      failing(apiError(ErrorCode.UnsupportedFileType)),
    ).resolves.toEqual({ ok: false, error: 'type' });
    await expect(failing(apiError(ErrorCode.FileTooLarge))).resolves.toEqual({
      ok: false,
      error: 'too-big',
    });
    await expect(failing(new TypeError('Network'))).resolves.toEqual({
      ok: false,
      error: 'network',
    });
  });
});
