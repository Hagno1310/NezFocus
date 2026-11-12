import { DISPLAY_NAME_MAX, type CurrentUser } from '@nezfocus/shared';
import type {
  AttachmentRepository,
  ImageFile,
} from '../attachments/AttachmentRepository';
import {
  imageErrorOf,
  uploadImage,
  type ImageError,
} from '../attachments/upload';
import type { AccountRepository } from './AccountRepository';

// S-ME-01 Sửa hồ sơ (REQ-AUTH-06): name, bio, avatar.

export type ProfileForm = { displayName: string; bio: string };
export type ProfileFormErrors = { displayName?: 'empty' | 'too-long' };

// AC6: the name is required. The fields cap their own length (32 / 200), so too-long only
// shows up for a pasted name the field did not cut.
export function profileFormErrors(form: ProfileForm): ProfileFormErrors {
  const name = form.displayName.trim();
  if (!name) return { displayName: 'empty' };
  if ([...name].length > DISPLAY_NAME_MAX) return { displayName: 'too-long' };
  return {};
}

export const saveProfile = (repo: AccountRepository, form: ProfileForm) =>
  repo.updateProfile({
    display_name: form.displayName.trim(),
    bio: form.bio.trim() || null,
  });

// ---- avatar (AUTH-06 AC1) ---------------------------------------------------------------

// Upload, then point the profile at the new avatar.
export async function changeAvatar(
  account: AccountRepository,
  attachments: AttachmentRepository,
  file: ImageFile,
): Promise<{ ok: true; user: CurrentUser } | { ok: false; error: ImageError }> {
  const upload = await uploadImage(attachments, file, 'avatar');
  if (!upload.ok) return upload;
  try {
    const user = await account.updateProfile({
      avatar_attachment_id: upload.id,
    });
    return { ok: true, user };
  } catch (err) {
    return { ok: false, error: imageErrorOf(err) };
  }
}
