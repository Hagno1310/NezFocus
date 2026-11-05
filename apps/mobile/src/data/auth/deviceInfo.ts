import type { DeviceInfo } from '@nezfocus/shared';
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// CR-28 #10: one id per install, sent as `device` on email-code / verify / login.
const KEY = 'device.id';

let id: string | undefined;

// ponytail: no `name` yet; add a device model name (expo-device) when S-ME-03 lists sessions.
export async function getDeviceInfo(): Promise<DeviceInfo> {
  id ??= (await SecureStore.getItemAsync(KEY)) ?? undefined;
  if (!id) {
    id = randomUUID();
    await SecureStore.setItemAsync(KEY, id);
  }
  return { id };
}
