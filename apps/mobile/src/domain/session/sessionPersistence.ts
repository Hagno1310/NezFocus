import { sessionStore, signIn, type SessionUser } from './sessionStore';

// There is no GET /users/me yet, so the user and whether S-ONB-01 is done are kept next to
// the tokens. A stale snapshot is harmless: the first request with dead tokens ends the session.
export type SavedSession = { user: SessionUser; completed: boolean };

export function persistSession(save: (s: SavedSession | null) => void) {
  return sessionStore.subscribe((s, prev) => {
    if (s.status === prev.status && s.user === prev.user) return;
    save(
      s.user && s.status !== 'signed-out'
        ? { user: s.user, completed: s.status === 'signed-in' }
        : null,
    );
  });
}

export async function restoreSession(deps: {
  saved: () => Promise<SavedSession | null>;
  hasTokens: () => Promise<boolean>;
}) {
  try {
    const [saved, hasTokens] = await Promise.all([
      deps.saved(),
      deps.hasTokens(),
    ]);
    if (saved && hasTokens) signIn(saved.user, { completed: saved.completed });
  } catch {
    // Opens signed out, like a fresh install.
  }
}
