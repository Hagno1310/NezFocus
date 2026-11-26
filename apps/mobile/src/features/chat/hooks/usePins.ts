import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { messageStore } from '../../../data/messages';
import { onGatewayEvent } from '../../../domain/gateway/gatewayStore';

export const pinsKey = (channelId: string) => ['pins', channelId] as const;

// S-HOME-03 `pins` (REQ-MSG-10): asked while the drawer is open; a pin of this channel
// changing, or a pinned message edited / deleted, asks again. Offline: the last list stays.
export function usePins(channelId: string, open: boolean) {
  const client = useQueryClient();
  useEffect(
    () =>
      onGatewayEvent((e) => {
        if (
          (e.t === 'CHANNEL_PINS_UPDATE' ||
            e.t === 'MESSAGE_DELETE' ||
            e.t === 'MESSAGE_UPDATE') &&
          e.d.channel_id === channelId
        )
          void client.invalidateQueries({ queryKey: pinsKey(channelId) });
      }),
    [client, channelId],
  );
  return useQuery({
    queryKey: pinsKey(channelId),
    queryFn: () => messageStore.pins(channelId),
    enabled: open,
    networkMode: 'offlineFirst',
  }).data;
}
