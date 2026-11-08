import type { CreateServerRequest, ServerResponse } from '@nezfocus/shared';

// SRS 5.3 Server. Remote and Fake implementations live in data/servers.
export interface ServerRepository {
  createServer(body: CreateServerRequest): Promise<ServerResponse>;
  // The categories and channels the caller may view (S-HOME-02).
  getServer(id: string): Promise<ServerResponse>;
}
