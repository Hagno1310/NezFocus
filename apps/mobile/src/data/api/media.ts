import { apiBaseUrl } from './index';

// Media paths from the API (avatars, server icons) are relative to /api/v1; a fake keeps a
// local file:// URI, which is used as it is.
export const mediaUri = (path: string | null | undefined) =>
  !path ? null : /^[a-z]+:/i.test(path) ? path : `${apiBaseUrl}${path}`;
