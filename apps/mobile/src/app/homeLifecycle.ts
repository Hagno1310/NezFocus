import { Hash } from 'lucide-react-native';
import { serverRepository } from '../data/servers';
import { homePrefs } from '../data/servers/homePrefs';
import { onGatewayEvent } from '../domain/gateway/gatewayStore';
import { firstTextChannel } from '../domain/servers/createServer';
import type { HomeState } from '../domain/servers/drawer';
import {
  applyGatewayEvent,
  homeStore,
  openChannel,
  resetHome,
  setServerDetail,
  setCollapsed,
} from '../domain/servers/homeStore';
import { sessionStore } from '../domain/session/sessionStore';
import { i18n } from '../shared/i18n';
import { showToast } from '../shared/ui/Toast';

// S-HOME-02: keeps homeStore in step with READY and the SERVER_* / CHANNEL_* events, fetches
// the channels of the server the drawer shows, and remembers collapsed categories.
export function startHomeLifecycle() {
  const stopEvents = onGatewayEvent((event) => {
    const removed = applyGatewayEvent(event);
    // Edge case `channel-removed`.
    if (removed)
      showToast({
        message: i18n.t('servers.drawer.channelRemoved', { name: removed }),
        icon: Hash,
      });
  });

  const fetching = new Set<string>();
  const fetchChannels = (serverId: string) => {
    fetching.add(serverId);
    serverRepository
      .getServer(serverId)
      .then(setServerDetail)
      // Offline: the list keeps loading; the next READY (reconnect) asks again.
      .catch(() => {})
      .finally(() => fetching.delete(serverId));
  };

  const sync = (s: HomeState, prev?: HomeState) => {
    // The shown server, and the one of the open channel (its name heads the channel screen).
    for (const serverId of new Set([s.selectedServerId, s.open?.serverId]))
      if (serverId && !s.channels[serverId] && !fetching.has(serverId))
        fetchChannels(serverId);
    const id = s.selectedServerId;
    if (!id) return;
    if (!(id in s.collapsed)) {
      setCollapsed(id, []);
      void homePrefs
        .collapsed(id)
        .then((ids) => ids.length && setCollapsed(id, ids));
    } else if (
      prev &&
      id in prev.collapsed &&
      prev.collapsed[id] !== s.collapsed[id]
    ) {
      void homePrefs.setCollapsed(id, s.collapsed[id]!);
    }
    // Signed in with servers but nothing open yet: the first text channel of the shown server.
    const channels = s.channels[id];
    const first = !s.open && channels && firstTextChannel(channels);
    if (first) openChannel({ serverId: id, channelId: first.id });
  };
  const stopStore = homeStore.subscribe(sync);

  const stopSession = sessionStore.subscribe((s, prev) => {
    if (prev.status === 'signed-in' && s.status !== 'signed-in') resetHome();
  });

  return () => {
    stopEvents();
    stopStore();
    stopSession();
  };
}
