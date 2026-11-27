import type { StoreApi } from 'zustand/vanilla';

export type PushDevice = {
  token(): Promise<string | null>;
  onTokenChange(cb: (token: string) => void): () => void;
  // Deletes the token on the phone: FCM answers UNREGISTERED and the backend drops it.
  forget(): Promise<void>;
};

export type PushTokenRepository = { register(token: string): Promise<void> };

type Session = Pick<StoreApi<{ status: string }>, 'getState' | 'subscribe'>;

// The backend drops the token on sign-out (REQ-AUTH-07 AC1); dropping it on the phone too
// covers a sign-out made offline and a session that ended elsewhere.
export function startPushRegistration(deps: {
  device: PushDevice;
  repo: PushTokenRepository;
  session: Session;
  onForeground(cb: () => void): () => void;
}) {
  const { device, repo, session } = deps;
  let failed = false;
  let forgetting: Promise<void> = Promise.resolve();
  const register = async (token?: string) => {
    if (session.getState().status !== 'signed-in') return;
    try {
      await forgetting; // else the old token, about to be deleted, is sent
      const t = token ?? (await device.token());
      if (!t) return;
      await repo.register(t);
      failed = false;
    } catch {
      failed = true; // offline, or a build without google-services.json
    }
  };
  void register();
  const stopSession = session.subscribe((s, prev) => {
    if (s.status === prev.status) return;
    if (s.status === 'signed-in') void register();
    else if (s.status === 'signed-out')
      forgetting = device.forget().catch(() => {});
  });
  const stopToken = device.onTokenChange((t) => void register(t));
  const stopForeground = deps.onForeground(() => {
    if (failed) void register();
  });
  return () => {
    stopSession();
    stopToken();
    stopForeground();
  };
}
