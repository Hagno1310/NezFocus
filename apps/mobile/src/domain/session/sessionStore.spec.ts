import { beforeEach, describe, expect, it } from 'vitest';
import {
  endSession,
  markAccountIncomplete,
  takeNavigationToRestore,
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

  it('a second endSession (concurrent 401s) keeps the first snapshot', () => {
    signIn(an, { completed: true });
    setNavigationState({ index: 0, routes: [{ name: 'Main' }] });
    endSession('revoked');
    setNavigationState({ index: 0, routes: [{ name: 'SignIn' }] });
    endSession('expired');
    expect(sessionStore.getState().ended).toMatchObject({
      reason: 'revoked',
      user: an,
      navigationState: { routes: [{ name: 'Main' }] },
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

  it('AUTH-04 AC5: signing in again as the same user returns to the screen being viewed, once', () => {
    signIn(an, { completed: true });
    const screen = { index: 0, routes: [{ name: 'Main' }] };
    setNavigationState(screen);
    endSession('expired');
    signIn(an, { completed: true });
    expect(takeNavigationToRestore()).toEqual(screen);
    expect(takeNavigationToRestore()).toBeUndefined();
  });

  it('another account, or a sign-out in between, starts from Home', () => {
    signIn(an, { completed: true });
    setNavigationState({ index: 0, routes: [{ name: 'Main' }] });
    endSession('expired');
    signIn({ id: '2', email: 'binh.tran@gmail.com' }, { completed: true });
    expect(takeNavigationToRestore()).toBeUndefined();
  });

  it('40309 moves a signed-in user to Complete account; ignored when signed out', () => {
    markAccountIncomplete();
    expect(sessionStore.getState().status).toBe('signed-out');
    signIn(an, { completed: true });
    markAccountIncomplete();
    expect(sessionStore.getState().status).toBe('incomplete');
  });

  it('42601 raises the update-required flag with the minimum version', () => {
    requireUpgrade('1.2.0');
    expect(sessionStore.getState()).toMatchObject({
      upgradeRequired: true,
      minVersion: '1.2.0',
    });
  });
});
