import type { AvatarUrls } from '@nezfocus/shared';
import { apiBaseUrl } from '../../data/api';

// CurrentUser.avatar paths are relative to /api/v1 (#71); the Fake keeps a local file.
export const avatarUri = (
  avatar: AvatarUrls | null | undefined,
  size: keyof AvatarUrls,
) => {
  const path = avatar?.[size];
  if (!path) return null;
  return /^[a-z]+:/i.test(path) ? path : `${apiBaseUrl}${path}`;
};
