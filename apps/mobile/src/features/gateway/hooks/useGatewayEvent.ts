import type { DispatchEventName, DispatchPayload } from '@nezfocus/shared';
import { useEffect, useEffectEvent } from 'react';
import { onGatewayEvent } from '../../../domain/gateway/gatewayStore';

// SRS 7.3: screens get Gateway events here, never from a WebSocket.
export function useGatewayEvent<T extends DispatchEventName>(
  t: T,
  handler: (d: DispatchPayload<T>) => void,
) {
  const onEvent = useEffectEvent(handler);
  useEffect(
    () =>
      onGatewayEvent((event) => {
        if (event.t === t) onEvent(event.d as DispatchPayload<T>);
      }),
    [t],
  );
}
