import { ErrorCode } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import type { AccountRepository } from './AccountRepository';
import {
  avatarFileError,
  changeAvatar,
  clampOffset,
  cropRect,
  profileFormErrors,
  saveProfile,
} from './profile';

const apiError = (code: number, extra = {}) =>
  Object.assign(new Error('x'), { code, ...extra });
const noCall = () => Promise.reject(new Error('no call'));
const user = {
  id: '1',
  email: 'an.nguyen@gmail.com',
  username: 'an.nguyen',
  display_name: 'An',
  bio: null,
  avatar: null,
  account_completed: true,
  created_at: '2026-10-01T08:00:00.000Z',
};
const repo = (over: Partial<AccountRepository>): AccountRepository => ({
  me: noCall,
  changePassword: noCall,
  sessions: noCall,
  revokeSession: noCall,
  revokeOtherSessions: noCall,
  updateProfile: async () => user,
  createAttachment: async () => ({
    attachment_id: '9',
    upload_url: 'http://s3/put',
    expires_at: '2026-10-18T13:30:00.000Z',
  }),
  uploadFile: async () => {},
  completeAttachment: async () => ({
    id: '9',
    purpose: 'avatar',
    content_type: 'image/jpeg',
    width: 512,
    height: 512,
  }),
  ...over,
});
const file = { uri: 'file:///a.jpg', size: 80_000, type: 'image/jpeg' };

describe('cropRect / clampOffset (S-ME-01 crop)', () => {
  it('unmoved, a landscape photo is cut in the middle at its full height', () => {
    expect(cropRect({ width: 4000, height: 3000 }, 300, 1, 0, 0)).toEqual({
      originX: 500,
      originY: 0,
      width: 3000,
      height: 3000,
    });
  });

  it('zoomed ×2 and dragged right, the square moves left and halves', () => {
    // display scale 0.1 × 2 = 0.2 px per image px; +100 px drag = 500 image px.
    expect(cropRect({ width: 4000, height: 3000 }, 300, 2, 100, 0)).toEqual({
      originX: 750,
      originY: 750,
      width: 1500,
      height: 1500,
    });
  });

  it('the image never leaves a gap inside the circle', () => {
    // At ×1 the 400×300 display can move 50 px sideways and not at all up or down.
    expect(clampOffset({ width: 4000, height: 3000 }, 300, 1, 80, -20)).toEqual(
      { x: 50, y: 0 },
    );
  });
});

describe('profile form (AUTH-06)', () => {
  it('AC6: an empty name is an error; the bio is free up to 200', () => {
    expect(profileFormErrors({ displayName: '  ', bio: '' })).toEqual({
      displayName: 'empty',
    });
    expect(
      profileFormErrors({ displayName: 'An', bio: 'x'.repeat(200) }),
    ).toEqual({});
  });

  it('saves the trimmed name and an empty bio as null', async () => {
    const sent: unknown[] = [];
    await saveProfile(
      repo({ updateProfile: async (b) => (sent.push(b), user) }),
      { displayName: ' An ', bio: ' ' },
    );
    expect(sent).toEqual([{ display_name: 'An', bio: null }]);
  });
});

describe('changeAvatar (AUTH-06 AC1–AC4, SRS 5.3 upload)', () => {
  it('AC2: a GIF is refused before anything is sent', () => {
    expect(avatarFileError({ ...file, type: 'image/gif' })).toBe('type');
    expect(avatarFileError({ ...file, size: 9 * 1024 * 1024 })).toBe('too-big');
    expect(avatarFileError(file)).toBeNull();
  });

  it('AC1: create → PUT → complete → PATCH avatar_attachment_id', async () => {
    const calls: string[] = [];
    const r = await changeAvatar(
      repo({
        createAttachment: async (b) => {
          calls.push(`create ${b.purpose} ${b.content_type} ${b.size_bytes}`);
          return {
            attachment_id: '9',
            upload_url: 'http://s3/put',
            expires_at: '2026-10-18T13:30:00.000Z',
          };
        },
        uploadFile: async (url) => void calls.push(`put ${url}`),
        completeAttachment: async (id) => {
          calls.push(`complete ${id}`);
          return {
            id,
            purpose: 'avatar',
            content_type: 'image/jpeg',
            width: 512,
            height: 512,
          };
        },
        updateProfile: async (b) => {
          calls.push(`patch ${b.avatar_attachment_id}`);
          return user;
        },
      }),
      file,
    );
    expect(r).toEqual({ ok: true, user });
    expect(calls).toEqual([
      'create avatar image/jpeg 80000',
      'put http://s3/put',
      'complete 9',
      'patch 9',
    ]);
  });

  it('AC2 / AC3: 40014 and 40013 from the backend; a lost request is network', async () => {
    const failing = (err: unknown) =>
      changeAvatar(
        repo({ completeAttachment: () => Promise.reject(err) }),
        file,
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
