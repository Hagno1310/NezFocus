import { describe, expect, it } from 'vitest';
import type { AttachmentRepository } from '../attachments/AttachmentRepository';
import type { AccountRepository } from './AccountRepository';
import { changeAvatar, profileFormErrors, saveProfile } from './profile';

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
const account = (over: Partial<AccountRepository>): AccountRepository => ({
  me: noCall,
  changePassword: noCall,
  sessions: noCall,
  revokeSession: noCall,
  revokeOtherSessions: noCall,
  updateProfile: async () => user,
  ...over,
});
const attachments: AttachmentRepository = {
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
};
const file = { uri: 'file:///a.jpg', size: 80_000, type: 'image/jpeg' };

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
      account({ updateProfile: async (b) => (sent.push(b), user) }),
      { displayName: ' An ', bio: ' ' },
    );
    expect(sent).toEqual([{ display_name: 'An', bio: null }]);
  });
});

describe('changeAvatar (AUTH-06 AC1)', () => {
  it('uploads as `avatar`, then PATCHes avatar_attachment_id', async () => {
    const sent: unknown[] = [];
    const r = await changeAvatar(
      account({ updateProfile: async (b) => (sent.push(b), user) }),
      attachments,
      file,
    );
    expect(r).toEqual({ ok: true, user });
    expect(sent).toEqual([{ avatar_attachment_id: '9' }]);
  });

  it('a GIF never reaches the profile', async () => {
    await expect(
      changeAvatar(account({ updateProfile: noCall }), attachments, {
        ...file,
        type: 'image/gif',
      }),
    ).resolves.toEqual({ ok: false, error: 'type' });
  });
});
