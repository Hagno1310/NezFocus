import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  DISPLAY_NAME_MAX,
  ErrorCode,
  type CurrentUser,
} from '@nezfocus/shared';
import { asApiError } from '../auth/authFlow';
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

// ---- crop (S-ME-01 `crop`) -------------------------------------------------------------
// The photo is shown covering a D×D square (the circle's box) at `scale` ≥ 1 on top of the
// fit, its centre moved by (x, y) display px. Worklet-safe: also runs on the UI thread.

type Size = { width: number; height: number };

const displayScale = (img: Size, side: number, scale: number) => {
  'worklet';
  return (side / Math.min(img.width, img.height)) * scale;
};

// How far the centre may move before an edge of the photo enters the circle's box.
export function clampOffset(
  img: Size,
  side: number,
  scale: number,
  x: number,
  y: number,
) {
  'worklet';
  const k = displayScale(img, side, scale);
  const maxX = (img.width * k - side) / 2;
  const maxY = (img.height * k - side) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, x)) || 0,
    y: Math.min(maxY, Math.max(-maxY, y)) || 0,
  };
}

// The square of the photo (in its own pixels) that sits inside the circle's box.
export function cropRect(
  img: Size,
  side: number,
  scale: number,
  x: number,
  y: number,
) {
  const k = displayScale(img, side, scale);
  const at = clampOffset(img, side, scale, x, y);
  const size = Math.min(Math.round(side / k), img.width, img.height);
  const left = (img.width * k) / 2 - side / 2 - at.x;
  const top = (img.height * k) / 2 - side / 2 - at.y;
  const clamp = (v: number, max: number) =>
    Math.min(max - size, Math.max(0, Math.round(v / k)));
  return {
    originX: clamp(left, img.width),
    originY: clamp(top, img.height),
    width: size,
    height: size,
  };
}

// ---- upload (SRS 5.3) ------------------------------------------------------------------

export type AvatarFile = { uri: string; size: number; type: string };
export type AvatarError = 'type' | 'too-big' | 'network' | 'other';

// AC2 / AC3 before anything is sent: a GIF (Premium, Backlog) or more than 8 MB after the
// phone compressed it.
export function avatarFileError(file: AvatarFile): AvatarError | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'type';
  if (file.size > AVATAR_MAX_BYTES) return 'too-big';
  return null;
}

// AC1: ask for an upload URL, PUT the bytes, let the backend read them, then point the
// profile at the new avatar.
export async function changeAvatar(
  repo: AccountRepository,
  file: AvatarFile,
): Promise<
  { ok: true; user: CurrentUser } | { ok: false; error: AvatarError }
> {
  const early = avatarFileError(file);
  if (early) return { ok: false, error: early };
  try {
    const name = file.uri.split('/').pop() || 'avatar.jpg';
    const { attachment_id, upload_url } = await repo.createAttachment({
      purpose: 'avatar',
      filename: name.slice(-255),
      content_type: file.type,
      size_bytes: file.size,
    });
    await repo.uploadFile(upload_url, file);
    await repo.completeAttachment(attachment_id);
    const user = await repo.updateProfile({
      avatar_attachment_id: attachment_id,
    });
    return { ok: true, user };
  } catch (err) {
    const api = asApiError(err);
    if (!api) return { ok: false, error: 'network' };
    if (api.code === ErrorCode.UnsupportedFileType)
      return { ok: false, error: 'type' };
    if (api.code === ErrorCode.FileTooLarge)
      return { ok: false, error: 'too-big' };
    return { ok: false, error: 'other' };
  }
}
