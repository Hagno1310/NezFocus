import * as SecureStore from 'expo-secure-store';
import type { Tokens, TokenStore } from '../api/client';

// REQ-AUTH-02: tokens live in Android Keystore-backed storage, never AsyncStorage. expo-secure-store
// instead of react-native-keychain: same Keystore, ships with Expo, and its config plugin keeps the
// data out of Auto Backup, so a reinstall starts signed out (AUTH-02 AC5).
const KEY = 'auth.tokens';

let cache: Tokens | null | undefined;

export const secureTokenStore: TokenStore = {
  async get() {
    if (cache === undefined) {
      const raw = await SecureStore.getItemAsync(KEY);
      cache = raw ? (JSON.parse(raw) as Tokens) : null;
    }
    return cache;
  },
  async set(tokens) {
    cache = tokens;
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
  },
  async clear() {
    cache = null;
    await SecureStore.deleteItemAsync(KEY);
  },
};
