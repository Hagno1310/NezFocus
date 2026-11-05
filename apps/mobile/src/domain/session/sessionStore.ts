import { createStore } from 'zustand/vanilla';

// Which root stack the app shows. `incomplete` = signed in but S-ONB-01 not done (REQ-AUTH-01 AC5, 40309).
export type SessionStatus = 'signed-out' | 'incomplete' | 'signed-in';

// Client state lives in vanilla Zustand stores under domain/ so data/ (ApiClient) can update them
// without React; screens read them with `useStore(sessionStore, selector)` from 'zustand'.
export const sessionStore = createStore<{ status: SessionStatus }>(() => ({
  status: 'signed-out',
}));

export const setSessionStatus = (status: SessionStatus) =>
  sessionStore.setState({ status });
