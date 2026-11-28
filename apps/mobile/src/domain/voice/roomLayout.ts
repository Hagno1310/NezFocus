import { Permission, hasPermission, type FocusControl } from '@nezfocus/shared';

// S-ROOM-01 by state. `start`: the Start bar — none on a plain voice channel (`not-study-room`),
// a hint before joining, the button once in, managers only (`managers-only`, REQ-STUDY-11).
export type StartBar = 'none' | 'hint' | 'start' | 'managers-only';
// Preview only: why "Vào phòng" is off (`offline`, 08 S-SET-EDGE `timed-out-voice`, `no-connect`).
export type RoomAccess = 'ok' | 'offline' | 'timed-out' | 'no-connect';

export function roomLayout({
  focusControl,
  perms,
  joined,
  online,
  timedOut = false,
}: {
  focusControl: FocusControl;
  perms: bigint;
  joined: boolean;
  online: boolean;
  timedOut?: boolean; // REQ-ROLE-05: my timeout in this server is running
}) {
  const access: RoomAccess = joined
    ? 'ok'
    : !online
      ? 'offline'
      : timedOut
        ? 'timed-out'
        : hasPermission(perms, Permission.CONNECT)
          ? 'ok'
          : 'no-connect';
  const start: StartBar =
    focusControl === 'off'
      ? 'none'
      : focusControl === 'managers' &&
          !hasPermission(perms, Permission.MANAGE_STUDY_ROOMS)
        ? 'managers-only'
        : joined
          ? 'start'
          : 'hint';
  // chốt 26/11/2026: no SPEAK / VIDEO → no Mic / Camera; offline, no CONNECT → neither (CR-22).
  const media = access === 'ok';
  return {
    access,
    start,
    mic: media && hasPermission(perms, Permission.SPEAK),
    camera: media && hasPermission(perms, Permission.VIDEO),
  };
}
