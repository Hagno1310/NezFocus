import { localDms } from '../data/dm';
import { dmStore, dmView } from '../domain/dm/dmStore';
import { emptyDms, reduceDms } from '../domain/dm/dms';
import { onGatewayEvent } from '../domain/gateway/gatewayStore';
import { homeStore } from '../domain/servers/homeStore';
import { sessionStore } from '../domain/session/sessionStore';

// SRS 8.7: S-DM-01 comes from the local cache first, then READY / CHANNEL_CREATE /
// MESSAGE_CREATE keep both the store and the cache current.
export function startDmLifecycle() {
  const loadCache = () => {
    if (sessionStore.getState().status !== 'signed-in') return;
    localDms
      .all()
      .then((list) => {
        if (!dmStore.getState().loaded && list.length)
          dmStore.setState({
            loaded: false,
            byId: Object.fromEntries(list.map((d) => [d.id, d])),
          });
      })
      .catch(() => {});
  };
  loadCache();
  const stopEvents = onGatewayEvent((event) => {
    const before = dmStore.getState();
    const after = reduceDms(before, event);
    if (after !== before) dmStore.setState(after);
  });
  const stopStore = dmStore.subscribe((s, prev) => {
    if (s.byId !== prev.byId && s.loaded)
      localDms.replace(Object.values(s.byId)).catch(() => {});
  });
  // Opening a server channel takes the screen from the DM.
  const stopHome = homeStore.subscribe((s, prev) => {
    if (s.open !== prev.open && s.open) dmView.setState({ open: null });
  });
  const stopSession = sessionStore.subscribe((s, prev) => {
    if (s.status === prev.status) return;
    if (s.status === 'signed-in') loadCache();
    else {
      dmStore.setState(emptyDms);
      dmView.setState({ listShown: false, open: null });
    }
  });
  return () => {
    stopEvents();
    stopStore();
    stopHome();
    stopSession();
  };
}
