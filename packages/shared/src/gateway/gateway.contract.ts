import { z } from 'zod';
import { ClientPlatform } from '../auth/auth.contract.js';
import { SnowflakeId } from '../snowflake.js';

// SRS 5.4: wss://<host>/gateway?v=1&encoding=json. Not under /api/v1.
export const GatewayRoutes = { connect: '/gateway' } as const;
export const GATEWAY_VERSION = 1;

export const GatewayOp = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  PRESENCE_UPDATE: 3,
  VOICE_STATE_UPDATE: 4,
  FOCUS_HEARTBEAT: 5,
  RESUME: 6,
  RECONNECT: 7,
  SUBSCRIBE: 8,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
  APP_STATE: 12, // DEC-34
} as const;
export type GatewayOp = (typeof GatewayOp)[keyof typeof GatewayOp];

// SRS 11.2. 4006 was never assigned; 4012 is retired and must not be reused.
export const GatewayCloseCode = {
  UNKNOWN_ERROR: 4000,
  UNKNOWN_OPCODE: 4001,
  DECODE_ERROR: 4002,
  NOT_AUTHENTICATED: 4003,
  // Close reason text = SessionEndReason (auth.contract.ts); empty = expired.
  AUTHENTICATION_FAILED: 4004,
  ALREADY_AUTHENTICATED: 4005,
  INVALID_SEQ: 4007,
  RATE_LIMITED: 4008,
  SESSION_TIMED_OUT: 4009,
  UNSUPPORTED_VERSION: 4010,
  ACCOUNT_UNAVAILABLE: 4011,
} as const;
export type GatewayCloseCode =
  (typeof GatewayCloseCode)[keyof typeof GatewayCloseCode];

const frame = <Op extends GatewayOp, D extends z.ZodType>(op: Op, d: D) =>
  z.object({ op: z.literal(op), d });

// REQ-AUTH-05 manual status; P1-B4 (#13) may extend.
export const PresenceStatus = z.enum(['online', 'idle', 'dnd', 'invisible']);
export type PresenceStatus = z.infer<typeof PresenceStatus>;

export const Identify = z.object({
  token: z.string().min(1), // access token
  device: z.object({
    platform: ClientPlatform,
    app_version: z.string().min(1).max(32),
    device_id: z.string().min(1).max(64), // same id as DeviceInfo.id
  }),
  presence: z.object({ status: PresenceStatus }).optional(),
});
export type Identify = z.infer<typeof Identify>;

export const Resume = z.object({
  token: z.string().min(1),
  session_id: SnowflakeId,
  seq: z.number().int().min(0), // last `s` the client received
});
export type Resume = z.infer<typeof Resume>;

export const AppState = z.object({
  state: z.enum(['foreground', 'background']),
});
export type AppState = z.infer<typeof AppState>;

// Payloads SRS 5.4 does not spell out; their owner tickets refine them.
// P1-B4 (#13)
export const PresenceUpdate = z.object({ status: PresenceStatus });
// P3 voice; LiveKit token stays on REST (DEC-33)
export const VoiceStateUpdate = z.object({
  channel_id: SnowflakeId.nullable(), // null = leave
  self_mute: z.boolean(),
  self_deaf: z.boolean(),
  self_video: z.boolean(),
});
// REQ-STUDY-15, every 60 s while in a Room Session
export const FocusHeartbeat = z.object({ focus_session_id: SnowflakeId });
// P2-B1 (#18): the server open on screen; null = none
export const Subscribe = z.object({ server_id: SnowflakeId.nullable() });

const LastSequence = z.number().int().min(0).nullable(); // null before any DISPATCH

export const ClientFrame = z.discriminatedUnion('op', [
  frame(GatewayOp.HEARTBEAT, LastSequence),
  frame(GatewayOp.IDENTIFY, Identify),
  frame(GatewayOp.PRESENCE_UPDATE, PresenceUpdate),
  frame(GatewayOp.VOICE_STATE_UPDATE, VoiceStateUpdate),
  frame(GatewayOp.FOCUS_HEARTBEAT, FocusHeartbeat),
  frame(GatewayOp.RESUME, Resume),
  frame(GatewayOp.SUBSCRIBE, Subscribe),
  frame(GatewayOp.APP_STATE, AppState),
]);
export type ClientFrame = z.infer<typeof ClientFrame>;

export const Hello = z.object({
  heartbeat_interval: z.number().int().positive(),
});
export type Hello = z.infer<typeof Hello>;

// `d` is checked per event by parseDispatch (events.contract.ts).
export const DispatchFrame = z.object({
  op: z.literal(GatewayOp.DISPATCH),
  d: z.unknown(),
  s: z.number().int().positive(),
  t: z.string().min(1),
});
export type DispatchFrame = z.infer<typeof DispatchFrame>;

export const ServerFrame = z.discriminatedUnion('op', [
  DispatchFrame,
  frame(GatewayOp.HEARTBEAT, z.null()), // backend asks for a heartbeat now
  frame(GatewayOp.RECONNECT, z.null()),
  frame(GatewayOp.INVALID_SESSION, z.boolean()), // resumable
  frame(GatewayOp.HELLO, Hello),
  frame(GatewayOp.HEARTBEAT_ACK, z.null()),
]);
export type ServerFrame = z.infer<typeof ServerFrame>;
