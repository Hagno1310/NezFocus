import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedRoom, SavedRoomStore } from '../../domain/voice/rejoin';

// SRS 7.3.2: not secret → AsyncStorage.
const KEY = 'voice.room';

export const savedRoom: SavedRoomStore = {
  async load() {
    const raw = await AsyncStorage.getItem(KEY);
    try {
      return raw ? (JSON.parse(raw) as SavedRoom) : null;
    } catch {
      return null;
    }
  },
  save: (room) => AsyncStorage.setItem(KEY, JSON.stringify(room)),
  clear: () => AsyncStorage.removeItem(KEY),
};
