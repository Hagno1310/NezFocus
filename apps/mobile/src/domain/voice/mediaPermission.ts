// 10 S-MOD-05 › Luồng: explain first; once refused Android asks straight away; blocked → the
// sheet that opens Settings. `asked`: Android has been asked at least once on this phone.
export type MediaPermission = {
  granted: boolean;
  asked: boolean;
  canAskAgain: boolean;
};

export type PermissionStep = 'granted' | 'explain' | 'ask' | 'blocked';

export const permissionStep = (p: MediaPermission): PermissionStep =>
  p.granted
    ? 'granted'
    : !p.asked
      ? 'explain'
      : p.canAskAgain
        ? 'ask'
        : 'blocked';

export interface MediaPermissions {
  check(): Promise<MediaPermission>;
  request(): Promise<boolean>; // the Android dialog
  openSettings(): Promise<void>;
}
