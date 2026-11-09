import { permissionBits, type PermissionName } from './permissions.js';

export type RolePermissionGroupId =
  'general' | 'members' | 'messages' | 'voice' | 'study';

// Spec 08 S-SET-02 › Nhóm quyền: the rows of the role editor, in screen order. Labels are
// the app's i18n; a bit not listed here has no row in the MVP.
export const ROLE_PERMISSION_GROUPS: readonly {
  id: RolePermissionGroupId;
  permissions: readonly PermissionName[];
}[] = [
  {
    id: 'general',
    permissions: [
      'ADMINISTRATOR',
      'MANAGE_SERVER',
      'MANAGE_CHANNELS',
      'MANAGE_ROLES',
      'CREATE_INVITE',
    ],
  },
  {
    id: 'members',
    permissions: ['KICK_MEMBERS', 'BAN_MEMBERS', 'MODERATE_MEMBERS'],
  },
  {
    id: 'messages',
    permissions: [
      'VIEW_CHANNEL',
      'SEND_MESSAGES',
      'ATTACH_FILES',
      'EMBED_LINKS',
      'ADD_REACTIONS',
      'MENTION_EVERYONE',
      'MANAGE_MESSAGES',
    ],
  },
  {
    id: 'voice',
    permissions: ['CONNECT', 'SPEAK', 'VIDEO', 'MUTE_MEMBERS', 'MOVE_MEMBERS'],
  },
  {
    id: 'study',
    permissions: ['MANAGE_STUDY_ROOMS', 'CREATE_TASKS', 'MANAGE_TASKS'],
  },
];

// SRS 8.5.1 (v1.7): bits without an MVP screen. Saving a role keeps their value.
export const HIDDEN_ROLE_PERMISSIONS = permissionBits(
  'VIEW_AUDIT_LOG',
  'MANAGE_EVENTS',
  'CHANGE_NICKNAME',
  'MANAGE_NICKNAMES',
  'DEAFEN_MEMBERS',
);

// REQ-ROLE-02 (v1.7): the bitmap to store when a role editor saves `edited` over `saved`.
export const keepHiddenPermissions = (saved: bigint, edited: bigint) =>
  (edited & ~HIDDEN_ROLE_PERMISSIONS) | (saved & HIDDEN_ROLE_PERMISSIONS);
