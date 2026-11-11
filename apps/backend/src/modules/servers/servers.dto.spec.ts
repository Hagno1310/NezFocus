import { ServerResponse } from '@nezfocus/shared';
import type { FullServer } from './servers.repository.js';
import { toServerResponse } from './servers.dto.js';

// A Study Server from the seed: the Owner holds "Trưởng nhóm" (SRS 8.5.3).
const full: FullServer = {
  id: 100n,
  name: 'Ôn thi Giải tích 2',
  iconKey: null,
  ownerId: 1n,
  template: 'study_server',
  systemChannelId: null,
  memberCount: 1,
  createdAt: new Date('2026-11-05T08:00:00.000Z'),
  channels: [],
  roles: [],
  myRoleIds: [101n],
} as unknown as FullServer;

describe('toServerResponse', () => {
  it("sends the caller's own roles as strings (P1-A3.1 #64)", () => {
    const server = toServerResponse(full);
    expect(server.me).toEqual({ role_ids: ['101'] });
    expect(ServerResponse.safeParse(server).success).toBe(true);
  });
});
