import { z } from 'zod';
import { UserSettings } from '../account/settings.contract.js';
import { CurrentUser } from '../auth/auth.contract.js';
import {
  PresenceEvent,
  PresenceStatus,
} from '../presence/presence.contract.js';
import {
  ChannelDeleted,
  ChannelResponse,
} from '../servers/channel.contract.js';
import {
  ServerRoleDeleted,
  ServerRoleEvent,
} from '../servers/role.contract.js';
import { ServerResponse, ServerSummary } from '../servers/server.contract.js';
import { SnowflakeId } from '../snowflake.js';
import { SoloSessionResponse } from '../study/solo.contract.js';
import { StreakState } from '../study/stats.contract.js';
import type { DispatchFrame } from './gateway.contract.js';

// SRS 5.4 READY. DMs, read states and relationships are added by the area that owns them.
export const Ready = z.object({
  session_id: SnowflakeId,
  user: CurrentUser,
  servers: z.array(ServerSummary), // REQ-SRV-01: oldest joined first (S-HOME-02 rail order)
  preferred_status: PresenceStatus, // REQ-AUTH-05: my chosen status, Invisible included
  presences: z.array(PresenceEvent), // people whose presence I receive (AUTH-05 AC1), as they see now
  settings: UserSettings, // SRS 5.4: my settings (the app reads them cache-first)
});
export type Ready = z.infer<typeof Ready>;

// SRS 5.4 DISPATCH t → schema of d: an area adds its event with one line here, nowhere else.
export const DispatchEvents = {
  READY: Ready,
  RESUMED: z.object({}),
  USER_UPDATE: CurrentUser,
  USER_SETTINGS_UPDATE: UserSettings, // SRS 5.4: after every PATCH /users/@me/settings, to every session of the user
  SOLO_SESSION_UPDATE: SoloSessionResponse, // REQ-STUDY-10: every change, to every session of the user
  PRESENCE_UPDATE: PresenceEvent, // REQ-AUTH-05: to the people who receive this user's presence, activity filtered per receiver
  STREAK_UPDATE: StreakState, // REQ-STUDY-03: when the streak or today's minutes change, to every session of the user
  SERVER_CREATE: ServerResponse, // REQ-SRV-01: to every session of the creator
  SERVER_UPDATE: ServerSummary, // to the members
  SERVER_ROLE_CREATE: ServerRoleEvent, // REQ-ROLE-01: to the members
  SERVER_ROLE_UPDATE: ServerRoleEvent, // also one per role moved by a reorder
  SERVER_ROLE_DELETE: ServerRoleDeleted,
  CHANNEL_CREATE: ChannelResponse, // REQ-SRV-02: only to members who can view it
  CHANNEL_UPDATE: ChannelResponse, // also when its overwrites or sync change (REQ-ROLE-03)
  CHANNEL_DELETE: ChannelDeleted,
} satisfies Record<string, z.ZodType>;

export type DispatchEventName = keyof typeof DispatchEvents;
export type DispatchPayload<T extends DispatchEventName> = z.infer<
  (typeof DispatchEvents)[T]
>;
export type DispatchEvent = {
  [T in DispatchEventName]: { t: T; s: number; d: DispatchPayload<T> };
}[DispatchEventName];

// null = event this build does not know yet (newer backend); throws on a bad payload.
export const parseDispatch = (frame: DispatchFrame): DispatchEvent | null => {
  if (!Object.hasOwn(DispatchEvents, frame.t)) return null;
  const t = frame.t as DispatchEventName;
  return {
    t,
    s: frame.s,
    d: DispatchEvents[t].parse(frame.d),
  } as DispatchEvent;
};
