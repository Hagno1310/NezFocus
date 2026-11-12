import {
  AVATAR_SIZES,
  type AttachmentPurpose,
  type AvatarUrls,
} from '@nezfocus/shared';

// Avatars and server icons live under `public/` and are served by AttachmentsController at
// /media/…, a path relative to /api/v1 like every route. The key never changes once
// written, so clients may cache it for good.
export const PUBLIC_PREFIX = 'public/';
export const MEDIA_ROUTE = 'media';

export const MEDIA_FOLDERS = {
  avatar: 'avatars',
  server_icon: 'server-icons',
} as const satisfies Record<AttachmentPurpose, string>;

export const mediaPrefix = (purpose: AttachmentPurpose, attachmentId: bigint) =>
  `${PUBLIC_PREFIX}${MEDIA_FOLDERS[purpose]}/${attachmentId}`;

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

// `servers.icon_key` → ServerSummary.icon_url: one size, 256 (rail 48, settings 96).
export const SERVER_ICON_SIZE = 256;
export const serverIconUrl = (prefix: string | null): string | null =>
  prefix?.startsWith(PUBLIC_PREFIX)
    ? `/${MEDIA_ROUTE}/${prefix.slice(PUBLIC_PREFIX.length)}/${SERVER_ICON_SIZE}.webp`
    : null;
