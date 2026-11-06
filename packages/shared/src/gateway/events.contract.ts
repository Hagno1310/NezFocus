import { z } from 'zod';
import { CurrentUser } from '../auth/auth.contract.js';
import { SnowflakeId } from '../snowflake.js';
import { SoloSessionResponse } from '../study/solo.contract.js';
import type { DispatchFrame } from './gateway.contract.js';

// P0 READY: the rest of SRS 5.4 (servers, DMs, read states, relationships) is added by the area that owns it.
export const Ready = z.object({
  session_id: SnowflakeId,
  user: CurrentUser,
});
export type Ready = z.infer<typeof Ready>;

// SRS 5.4 DISPATCH t → schema of d: an area adds its event with one line here, nowhere else.
export const DispatchEvents = {
  READY: Ready,
  RESUMED: z.object({}),
  USER_UPDATE: CurrentUser,
  SOLO_SESSION_UPDATE: SoloSessionResponse, // REQ-STUDY-10: every change, to every session of the user
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
