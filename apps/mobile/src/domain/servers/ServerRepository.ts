import type {
  ChannelResponse,
  CreateChannelRequest,
  CreateServerRequest,
  ServerResponse,
  ServerSummary,
  UpdateChannelPositionsRequest,
  UpdateChannelRequest,
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
}
