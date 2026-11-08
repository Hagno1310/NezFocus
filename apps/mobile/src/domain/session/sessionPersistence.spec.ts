import { beforeEach, describe, expect, it, vi } from 'vitest';
import { persistSession, restoreSession } from './sessionPersistence';
import { sessionStore, signIn, signOut } from './sessionStore';

const an = { id: '1', email: 'an.nguyen@gmail.com' };

describe('session persistence (spec 01 › S-ONB-01: app closed midway reopens there)', () => {
  beforeEach(() => signOut());

  it('saves who is signed in and whether the account is complete; clears it on sign-out', () => {
    const save = vi.fn();
    const stop = persistSession(save);
    signIn(an, { completed: false });
    signIn(an, { completed: true });
    signOut();
    stop();
    expect(save.mock.calls).toEqual([
      [{ user: an, completed: false }],
      [{ user: an, completed: true }],
      [null],
    ]);
  });

  it('restores the saved session only while tokens are still stored', async () => {
    const saved = { user: an, completed: false };
    await restoreSession({
      saved: async () => saved,
      hasTokens: async () => false,
    });
    expect(sessionStore.getState().status).toBe('signed-out');
    await restoreSession({
      saved: async () => saved,
      hasTokens: async () => true,
    });
    expect(sessionStore.getState()).toMatchObject({
      status: 'incomplete',
      user: an,
    });
  });

  it('a broken store never blocks the app from opening', async () => {
    await expect(
      restoreSession({
        saved: () => Promise.reject(new Error('keystore')),
        hasTokens: async () => true,
      }),
    ).resolves.toBeUndefined();
    expect(sessionStore.getState().status).toBe('signed-out');
  });
});
