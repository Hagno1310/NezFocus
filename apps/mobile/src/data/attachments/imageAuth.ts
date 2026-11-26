import { createStore } from 'zustand/vanilla';
import { api, apiBaseUrl } from '../api';
import { secureTokenStore } from '../auth/secureTokenStore';

// CR-28 #29: message images are read with the bearer; the cache key is the attachment and
// variant, so a new token never downloads the same bytes again.
export const imageAuth = createStore<{ token: string | null }>(() => ({
  token: null,
}));

export async function loadImageToken() {
  const token = (await secureTokenStore.get())?.access_token ?? null;
  if (token !== imageAuth.getState().token) imageAuth.setState({ token });
}

// An image answered 401 (the access token expired): one refresh for every image waiting. At
// most one a minute: an image failing for another reason (offline) must not loop.
const REFRESH_GAP_MS = 60_000;
let refreshing: Promise<void> | null = null;
let lastRefresh = 0;
export function refreshImageToken() {
  if (!refreshing && Date.now() - lastRefresh < REFRESH_GAP_MS)
    return Promise.resolve();
  lastRefresh = Date.now();
  refreshing ??= api
    .refresh()
    .then((token) => imageAuth.setState({ token }))
    .catch(() => {})
    .finally(() => (refreshing = null));
  return refreshing;
}

export const imageSource = (
  path: string,
  cacheKey: string,
  token: string | null,
) => ({
  uri: `${apiBaseUrl}${path}`,
  cacheKey,
  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
});
