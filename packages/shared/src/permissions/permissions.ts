import { z } from 'zod';

// SRS 8.5.1. Bit 13 is a retired placeholder; bits 29–62 are reserved; bit 63 is the BIGINT sign bit.
export const Permission = {
  CREATE_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_SERVER: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  VIEW_CHANNEL: 1n << 8n,
  SEND_MESSAGES: 1n << 9n,
  MANAGE_MESSAGES: 1n << 10n,
  EMBED_LINKS: 1n << 11n,
  ATTACH_FILES: 1n << 12n,
  MENTION_EVERYONE: 1n << 14n,
  CONNECT: 1n << 15n,
  SPEAK: 1n << 16n,
  VIDEO: 1n << 17n,
  MUTE_MEMBERS: 1n << 18n,
  DEAFEN_MEMBERS: 1n << 19n,
  MOVE_MEMBERS: 1n << 20n,
  CHANGE_NICKNAME: 1n << 21n,
  MANAGE_NICKNAMES: 1n << 22n,
  MANAGE_ROLES: 1n << 23n,
  MODERATE_MEMBERS: 1n << 24n,
  MANAGE_STUDY_ROOMS: 1n << 25n,
  CREATE_TASKS: 1n << 26n,
  MANAGE_TASKS: 1n << 27n,
  MANAGE_EVENTS: 1n << 28n,
} as const;

export type PermissionName = keyof typeof Permission;

const NAMES = Object.keys(Permission) as PermissionName[];

export const permissionBits = (...names: PermissionName[]) =>
  names.reduce((bits, name) => bits | Permission[name], 0n);

// What Owner and ADMINISTRATOR get: every defined bit, nothing reserved.
export const ALL_PERMISSIONS = permissionBits(...NAMES);

// SRS 8.5.3: the ✔ column of 8.5.1.
export const DEFAULT_EVERYONE_PERMISSIONS = permissionBits(
  'CREATE_INVITE',
  'ADD_REACTIONS',
  'VIEW_CHANNEL',
  'SEND_MESSAGES',
  'EMBED_LINKS',
  'ATTACH_FILES',
  'CONNECT',
  'SPEAK',
  'VIDEO',
  'CHANGE_NICKNAME',
  'CREATE_TASKS',
);

export const hasPermission = (perms: bigint, required: bigint) =>
  (perms & required) === required;

export const permissionNames = (perms: bigint) =>
  NAMES.filter((name) => (perms & Permission[name]) !== 0n);

// AGENTS.md: bitmaps travel as decimal strings in JSON (bigint in code).
export const PermissionBitmap = z
  .string()
  .refine(
    (s) => /^\d{1,19}$/.test(s) && BigInt(s) < 2n ** 63n,
    'invalid permission bitmap',
  );
export type PermissionBitmap = z.infer<typeof PermissionBitmap>;

export const toPermissionBitmap = (perms: bigint): PermissionBitmap =>
  perms.toString();

export const parsePermissionBitmap = (bitmap: PermissionBitmap) =>
  BigInt(PermissionBitmap.parse(bitmap));

// Inputs to the 8.5.2 algorithm. Ids are Snowflake strings, as the app holds them;
// the backend passes String(id). The @everyone role's id is the server's id.
export interface PermissionRole {
  id: string;
  permissions: bigint;
  position: number; // @everyone is 0; higher = more senior
}

export interface PermissionServer {
  id: string;
  ownerId: string;
  roles: readonly PermissionRole[]; // includes @everyone
}

export interface PermissionMember {
  userId: string;
  roleIds: readonly string[]; // without @everyone
  timeoutUntil?: Date | null;
}

export interface PermissionOverwriteInput {
  targetId: string; // role id (server id = @everyone) or user id
  type: 'role' | 'member';
  allow: bigint;
  deny: bigint;
}

export interface PermissionChannel {
  type: 'text' | 'voice' | 'category';
  overwrites: readonly PermissionOverwriteInput[];
  permissionsSynced?: boolean; // true → the parent category's overwrites apply
  parent?: { overwrites: readonly PermissionOverwriteInput[] } | null;
}
