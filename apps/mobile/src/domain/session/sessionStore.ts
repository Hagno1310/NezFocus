import type { SessionEndReason } from '@nezfocus/shared';
import { createStore } from 'zustand/vanilla';

// Which root stack the app shows. `incomplete` = signed in but S-ONB-01 not done (REQ-AUTH-01 AC5, 40309).
export type SessionStatus = 'signed-out' | 'incomplete' | 'signed-in';

// `expired` = the backend gave no reason: spec 01 › Phiên đăng nhập kết thúc uses the generic sentence.
export type EndReason = SessionEndReason | 'expired';

export type SessionUser = { id: string; email: string };

type SessionState = {
  status: SessionStatus;
  user: SessionUser | null;
  // AUTH-04 AC5: banner reason, prefilled email, and the root navigation state to return to (P0-4.3).
  ended: {
    reason: EndReason;
    user: SessionUser | null;
    navigationState: unknown;
  } | null;
  upgradeRequired: boolean; // NFR-MOB-12, 42601 from any request
  navigationState: unknown; // latest root state, kept so endSession can snapshot it
};

// Vanilla Zustand so data/ (ApiClient) can update it without React; screens use `useStore`.
export const sessionStore = createStore<SessionState>(() => ({
  status: 'signed-out',
  user: null,
  ended: null,
  upgradeRequired: false,
  navigationState: undefined,
}));

export const signIn = (
  user: SessionUser,
  { completed }: { completed: boolean },
) =>
  sessionStore.setState({
    status: completed ? 'signed-in' : 'incomplete',
    user,
    ended: null,
  });

export const markAccountIncomplete = () => {
  if (sessionStore.getState().status === 'signed-in')
    sessionStore.setState({ status: 'incomplete' });
};

export const endSession = (reason: EndReason) => {
  const { status, user, navigationState } = sessionStore.getState();
  if (status === 'signed-out') return; // concurrent 401s: keep the first snapshot
  sessionStore.setState({
    status: 'signed-out',
    user: null,
    ended: { reason, user, navigationState },
  });
};

export const signOut = () =>
  sessionStore.setState({ status: 'signed-out', user: null, ended: null });

export const requireUpgrade = () =>
  sessionStore.setState({ upgradeRequired: true });

export const setNavigationState = (navigationState: unknown) =>
  sessionStore.setState({ navigationState });
