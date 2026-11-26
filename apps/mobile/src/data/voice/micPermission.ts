import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, PermissionsAndroid } from 'react-native';
import type { MediaPermissions } from '../../domain/voice/mediaPermission';

const MIC = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
// Android only says "blocked" as the answer to a request, so the last answer is kept here.
const KEY = 'voice.micAnswer';

export const micPermission: MediaPermissions = {
  async check() {
    const [granted, answer] = await Promise.all([
      PermissionsAndroid.check(MIC),
      AsyncStorage.getItem(KEY),
    ]);
    return {
      granted,
      asked: answer !== null,
      canAskAgain: answer !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    };
  },
  async request() {
    const answer = await PermissionsAndroid.request(MIC);
    await AsyncStorage.setItem(KEY, answer);
    return answer === PermissionsAndroid.RESULTS.GRANTED;
  },
  openSettings: () => Linking.openSettings(),
};
