import { createPresenceSync } from '../../domain/presence/presence';
import { gatewayClient } from '../gateway';

export const presenceSync = createPresenceSync(gatewayClient);
