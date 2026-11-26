import {
  Permission,
  canActOnMember,
  hasPermission,
  type PermissionMember,
  type PermissionServer,
  type VoiceRoomMember,
} from '@nezfocus/shared';

// 02 S-HOME-10 `moderator-voice` (REQ-VC-04): only while they sit in a room of this server, by
// MUTE_MEMBERS / MOVE_MEMBERS in that room; both rows hidden for someone level with or above me
// or the Owner (chốt 26/11/2026). `mute`: "Tắt mic", or "Bật lại mic" once mod-muted.
export function moderatorVoiceRows({
  server,
  me,
  them,
  seat,
  roomPerms,
}: {
  server: PermissionServer;
  me: PermissionMember;
  them: PermissionMember;
  seat: VoiceRoomMember | undefined;
  roomPerms: bigint; // mine in their room
}): { mute: 'mute' | 'unmute' | null; disconnect: boolean } {
  const none = { mute: null, disconnect: false } as const;
  if (!seat || seat.server_id !== server.id || me.userId === them.userId)
    return none;
  if (!canActOnMember(server, me, them)) return none;
  return {
    mute: hasPermission(roomPerms, Permission.MUTE_MEMBERS)
      ? seat.mod_muted
        ? 'unmute'
        : 'mute'
      : null,
    disconnect: hasPermission(roomPerms, Permission.MOVE_MEMBERS),
  };
}
