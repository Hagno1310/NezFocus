import {
  ErrorCode,
  ServerName,
  type ChannelResponse,
  type ServerResponse,
} from '@nezfocus/shared';
import type { ServerRepository } from '../../domain/servers/ServerRepository';
import { ApiError } from '../api/client';

// EXPO_PUBLIC_FAKE=servers (WORKFLOW 4.2): An (id 1) creates servers from the general template.
export const FAKE_FULL_NAME = 'Đủ 100 server'; // shows create-error 40011
export const FAKE_NETWORK_NAME = 'Mất kết nối'; // shows create-error, network sentence

const fail = (status: number, code: number) =>
  new ApiError(status, { code, message: `fake ${code}` });

export function createFakeServerRepository(
  delayMs = 600,
  now: () => Date = () => new Date(),
): ServerRepository {
  let nextId = 1000;
  const id = () => String(nextId++);
  const wait = () => new Promise((r) => setTimeout(r, delayMs));

  return {
    async createServer(body) {
      await wait();
      if (body.name === FAKE_NETWORK_NAME)
        throw new TypeError('Network request failed');
      if (body.name === FAKE_FULL_NAME)
        throw fail(403, ErrorCode.MaxServersReached);
      if (
        !ServerName.safeParse(body.name).success ||
        body.template !== 'general'
      )
        throw fail(400, ErrorCode.ValidationError);

      const serverId = id();
      const channel = (
        type: ChannelResponse['type'],
        name: string,
        parent_id: string | null,
        position: number,
      ): ChannelResponse => ({
        id: id(),
        server_id: serverId,
        type,
        name,
        parent_id,
        position,
        focus_control: 'off',
        permissions_synced: true,
      });
      const category = channel('category', 'Kênh chung', null, 0);
      const general = channel('text', 'general', category.id, 0);
      const server: ServerResponse = {
        id: serverId,
        name: body.name,
        icon_url: null,
        owner_id: '1',
        template: 'general',
        system_channel_id: general.id,
        member_count: 1,
        created_at: now().toISOString(),
        channels: [
          category,
          general,
          channel('voice', 'Phòng thoại chung', category.id, 1),
        ],
        roles: [
          // SRS 8.5.3 @everyone (DEFAULT_EVERYONE_PERMISSIONS)
          {
            id: serverId,
            name: '@everyone',
            permissions: '69442369',
            position: 0,
          },
        ],
      };
      return server;
    },
  };
}

export const fakeServerRepository = createFakeServerRepository();
