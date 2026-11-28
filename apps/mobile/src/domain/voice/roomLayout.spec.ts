import { Permission } from '@nezfocus/shared';
import { describe, expect, it } from 'vitest';
import { roomLayout } from './roomLayout';

const ALL = Permission.CONNECT | Permission.SPEAK | Permission.VIDEO;
const base = {
  focusControl: 'everyone' as const,
  perms: ALL,
  joined: false,
  online: true,
};

describe('S-ROOM-01 layout', () => {
  it('`not-joined`: Mic, Camera, the hint bar', () => {
    expect(roomLayout(base)).toEqual({
      access: 'ok',
      start: 'hint',
      mic: true,
      camera: true,
    });
  });

  it('08 S-SET-EDGE `timed-out-voice`: Vào phòng off, no Mic / Camera; offline wins', () => {
    expect(roomLayout({ ...base, timedOut: true })).toEqual({
      access: 'timed-out',
      start: 'hint',
      mic: false,
      camera: false,
    });
    expect(roomLayout({ ...base, timedOut: true, online: false }).access).toBe(
      'offline',
    );
  });

  it('`study-room-idle`: the Start button once in', () => {
    expect(roomLayout({ ...base, joined: true }).start).toBe('start');
  });

  it('`not-study-room`: no Start bar', () => {
    expect(roomLayout({ ...base, focusControl: 'off' }).start).toBe('none');
  });

  it('`managers-only` without MANAGE_STUDY_ROOMS, in the preview too', () => {
    const managers = { ...base, focusControl: 'managers' as const };
    expect(roomLayout(managers).start).toBe('managers-only');
    expect(
      roomLayout({
        ...managers,
        perms: ALL | Permission.MANAGE_STUDY_ROOMS,
        joined: true,
      }).start,
    ).toBe('start');
  });

  it('`offline` / `no-connect`: no Mic, no Camera', () => {
    expect(roomLayout({ ...base, online: false })).toMatchObject({
      access: 'offline',
      mic: false,
      camera: false,
    });
    expect(
      roomLayout({ ...base, perms: Permission.SPEAK | Permission.VIDEO }),
    ).toMatchObject({ access: 'no-connect', mic: false, camera: false });
  });

  it('no SPEAK / VIDEO hides Mic / Camera (chốt 26/11/2026)', () => {
    expect(
      roomLayout({ ...base, perms: Permission.CONNECT, joined: true }),
    ).toMatchObject({ mic: false, camera: false });
  });

  it('in the room the network going does not take the buttons away', () => {
    expect(roomLayout({ ...base, joined: true, online: false })).toMatchObject({
      access: 'ok',
      mic: true,
    });
  });
});
