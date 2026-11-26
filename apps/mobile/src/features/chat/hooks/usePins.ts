import type { MessageResponse } from '@nezfocus/shared';
import { useEffect, useState } from 'react';
import { messageStore } from '../../../data/messages';
import { onGatewayEvent } from '../../../domain/gateway/gatewayStore';

// S-HOME-03 `pins` (REQ-MSG-10): loaded while the drawer is open, again when a pin of this
// channel changes or a pinned message is edited / deleted. Offline: the last list stays.
export function usePins(channelId: string, open: boolean) {
  const [pins, setPins] = useState<MessageResponse[] | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!open) return;
    let live = true;
    void messageStore
      .pins(channelId)
      .then((list) => live && setPins(list))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [channelId, open, version]);
  useEffect(
    () =>
      onGatewayEvent((e) => {
        if (
          (e.t === 'CHANNEL_PINS_UPDATE' ||
            e.t === 'MESSAGE_DELETE' ||
            e.t === 'MESSAGE_UPDATE') &&
          e.d.channel_id === channelId
        )
          setVersion((v) => v + 1);
      }),
    [channelId],
  );
  return pins;
}
