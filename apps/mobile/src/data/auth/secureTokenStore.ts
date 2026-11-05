import * as SecureStore from 'expo-secure-store';
import type { Tokens, TokenStore } from '../api/client';

// REQ-AUTH-02: Keystore-backed, not AsyncStorage; plugin keeps it out of Auto Backup → reinstall = signed out (AC5).
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
