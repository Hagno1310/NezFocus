import { beforeEach, describe, expect, it } from 'vitest';
import {
  endSession,
  markAccountIncomplete,
  requireUpgrade,
  sessionStore,
  setNavigationState,
  signIn,
  signOut,
} from './sessionStore';

const an = { id: '1', email: 'an.nguyen@gmail.com' };

describe('sessionStore', () => {
  beforeEach(() => signOut());

  it('signIn routes by whether the account is completed', () => {
    signIn(an, { completed: false });
    expect(sessionStore.getState().status).toBe('incomplete');
    signIn(an, { completed: true });
    expect(sessionStore.getState()).toMatchObject({
      status: 'signed-in',
      user: an,
    });
  });

  it('AUTH-04 AC5: ending a session keeps the reason, who it was and the screen being viewed', () => {
    signIn(an, { completed: true });
    const screen = { index: 0, routes: [{ name: 'Main' }] };
    setNavigationState(screen);
    endSession('reuse_detected');
    expect(sessionStore.getState()).toMatchObject({
      status: 'signed-out',
      user: null,
      ended: { reason: 'reuse_detected', user: an, navigationState: screen },
    });
  });

  it('signing in again clears the ended session; a plain sign-out leaves none', () => {
    signIn(an, { completed: true });
    endSession('expired');
    signIn(an, { completed: true });
    expect(sessionStore.getState().ended).toBeNull();
    signOut();
    expect(sessionStore.getState().ended).toBeNull();
  });

  it('40309 moves a signed-in user to Complete account; ignored when signed out', () => {
    markAccountIncomplete();
    expect(sessionStore.getState().status).toBe('signed-out');
    signIn(an, { completed: true });
    markAccountIncomplete();
    expect(sessionStore.getState().status).toBe('incomplete');
  });

  it('42601 raises the update-required flag', () => {
    requireUpgrade();
    expect(sessionStore.getState().upgradeRequired).toBe(true);
  });
});
