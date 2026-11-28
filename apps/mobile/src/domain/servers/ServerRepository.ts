import type {
  BanListResponse,
  BanRequest,
  ChannelResponse,
  CreateChannelRequest,
  CreateRoleRequest,
  CreateServerRequest,
  PermissionOverwrite,
  PutChannelPermissionRequest,
  RoleListResponse,
  RoleResponse,
  ServerMember,
  ServerResponse,
  ServerSummary,
  UpdateChannelPositionsRequest,
  UpdateChannelRequest,
  UpdateRolePositionsRequest,
  UpdateRoleRequest,
  UpdateServerRequest,
} from '@nezfocus/shared';

// SRS 5.3 Server. Remote and Fake implementations live in data/servers.
export interface ServerRepository {
  createServer(body: CreateServerRequest): Promise<ServerResponse>;
  // The categories and channels the caller may view (S-HOME-02).
  getServer(id: string): Promise<ServerResponse>;
  // S-SET-01 overview: name, kênh tin chào mừng (MANAGE_SERVER).
  updateServer(id: string, body: UpdateServerRequest): Promise<ServerSummary>;
  // REQ-SRV-02 (MANAGE_CHANNELS): S-SET-09, S-SET-06, S-HOME-02 `reordering`.
  createChannel(
    serverId: string,
    body: CreateChannelRequest,
  ): Promise<ChannelResponse>;
  updateChannel(
    id: string,
    body: UpdateChannelRequest,
  ): Promise<ChannelResponse>;
  deleteChannel(id: string): Promise<void>;
  setChannelPositions(
    serverId: string,
    body: UpdateChannelPositionsRequest,
  ): Promise<void>;
  // REQ-ROLE-01/02 (MANAGE_ROLES; hierarchy 8.5.2): S-SET-02.
  listRoles(serverId: string): Promise<RoleListResponse>;
  createRole(serverId: string, body: CreateRoleRequest): Promise<RoleResponse>;
  updateRole(
    serverId: string,
    roleId: string,
    body: UpdateRoleRequest,
  ): Promise<RoleResponse>;
  deleteRole(serverId: string, roleId: string): Promise<void>;
  setRolePositions(
    serverId: string,
    body: UpdateRolePositionsRequest,
  ): Promise<void>;
  // REQ-ROLE-03 (MANAGE_CHANNELS in the channel): S-SET-06 `overwrite-edit`.
  setChannelPermission(
    channelId: string,
    targetId: string,
    body: PutChannelPermissionRequest,
  ): Promise<PermissionOverwrite>;
  deleteChannelPermission(channelId: string, targetId: string): Promise<void>;
  // REQ-ROLE-04: every member (every page), by name; `channelId`: only who can view it.
  listMembers(serverId: string, channelId?: string): Promise<ServerMember[]>;
  // CR-28 #23: one role given (`give`) or taken.
  setMemberRole(
    serverId: string,
    userId: string,
    roleId: string,
    give: boolean,
  ): Promise<void>;
  // REQ-ROLE-05: set, change (from now) or lift (null) a timeout.
  timeoutMember(
    serverId: string,
    userId: string,
    until: string | null,
    reason?: string | null,
  ): Promise<ServerMember>;
  kickMember(
    serverId: string,
    userId: string,
    reason: string | null,
  ): Promise<void>;
  banMember(serverId: string, userId: string, body: BanRequest): Promise<void>;
  // REQ-ROLE-07: newest ban first; `after`: next_cursor of the previous page.
  listBans(
    serverId: string,
    query: { q?: string; after?: string | null },
  ): Promise<BanListResponse>;
  unbanMember(serverId: string, userId: string): Promise<void>;
}
