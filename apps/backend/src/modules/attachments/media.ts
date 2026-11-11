import { AVATAR_SIZES, type AvatarUrls } from '@nezfocus/shared';

// Avatars (and later server icons) live under `public/` and are served by MediaController
// at /media/…, a path relative to /api/v1 like every route. The key never changes once
// written, so clients may cache it for good.
export const PUBLIC_PREFIX = 'public/';
export const MEDIA_ROUTE = 'media';

export const avatarPrefix = (attachmentId: bigint) =>
  `${PUBLIC_PREFIX}avatars/${attachmentId}`;

export const avatarKey = (prefix: string, size: number) =>
  `${prefix}/${size}.webp`;

// `users.avatar_key` (the prefix) → the URLs CurrentUser carries.
export const avatarUrls = (prefix: string | null): AvatarUrls | null => {
  if (!prefix?.startsWith(PUBLIC_PREFIX)) return null;
  const path = prefix.slice(PUBLIC_PREFIX.length);
  const url = (size: number) => `/${MEDIA_ROUTE}/${path}/${size}.webp`;
  return Object.fromEntries(
    AVATAR_SIZES.map((s) => [String(s), url(s)]),
  ) as AvatarUrls;
};
