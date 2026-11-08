import * as SecureStore from 'expo-secure-store';
import type { SignInMode } from '../../domain/auth/authFlow';
import type { SavedSession } from '../../domain/session/sessionPersistence';

// Per install, like the tokens (reinstall forgets them, REQ-AUTH-02 AC5).
const METHOD = 'auth.lastMethod'; // AUTH-02 AC6: the way of the last successful sign-in
const SESSION = 'auth.session';

const read = async <T>(key: string): Promise<T | null> => {
  const raw = await SecureStore.getItemAsync(key);
  return raw ? (JSON.parse(raw) as T) : null;
};

export const authPrefs = {
  lastMethod: () => read<SignInMode>(METHOD),
  setLastMethod: (mode: SignInMode) =>
    SecureStore.setItemAsync(METHOD, JSON.stringify(mode)),
  savedSession: () => read<SavedSession>(SESSION),
  saveSession: (s: SavedSession | null) =>
    s
      ? SecureStore.setItemAsync(SESSION, JSON.stringify(s))
      : SecureStore.deleteItemAsync(SESSION),
};
