import type { DeviceInfo } from '@nezfocus/shared';
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { deviceLabel } from '../../domain/account/sessions';

// CR-28 #10: one id per install, sent as `device` on email-code / verify / login.
const KEY = 'device.id';

let id: string | undefined;

// `name` (S-ME-03 sessions) from Build.MANUFACTURER / Build.MODEL, which RN already exposes.
export async function getDeviceInfo(): Promise<DeviceInfo> {
  id ??= (await SecureStore.getItemAsync(KEY)) ?? undefined;
  if (!id) {
    id = randomUUID();
    await SecureStore.setItemAsync(KEY, id);
  }
  const c = Platform.constants as { Manufacturer?: string; Model?: string };
  const name = deviceLabel(c.Manufacturer, c.Model);
  return name ? { id, name } : { id };
}
