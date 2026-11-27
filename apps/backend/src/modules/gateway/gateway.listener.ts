import {
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  GATEWAY_VERSION,
  GatewayCloseCode,
  GatewayRoutes,
  SessionEndReason,
} from '@nezfocus/shared';
import type { Server } from 'node:http';
import { WebSocketServer } from 'ws';
import { toCurrentUser } from '../users/users.dto.js';
import { DmService } from '../channels/dm.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { ReadStatesService } from '../messaging/read-states.service.js';
import { SessionRepository } from '../auth/session.repository.js';
import { TokenService } from '../auth/token.service.js';
import { ServersService } from '../servers/servers.service.js';
import { SettingsService } from '../users/settings.service.js';
import { UsersRepository } from '../users/users.repository.js';
import { VoiceSessions } from '../voice/voice.service.js';
import { GatewayConnection, type Authenticate } from './gateway-connection.js';
import { GatewaySessions } from './gateway-sessions.js';
import { PresenceService } from './presence.service.js';
import { RoomSessionService } from '../study/room-session.service.js';

// SRS 7.1.1: the Gateway shares the HTTP server of the single backend process.
@Injectable()
export class GatewayListener
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private wss?: WebSocketServer;

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly sessions: GatewaySessions,
    private readonly tokens: TokenService,
    private readonly authSessions: SessionRepository,
    private readonly users: UsersRepository,
    private readonly servers: ServersService,
    private readonly presence: PresenceService,
    private readonly settings: SettingsService,
    private readonly friends: FriendsService,
    private readonly readStates: ReadStatesService,
    private readonly dms: DmService,
    private readonly voice: VoiceSessions,
    private readonly rooms: RoomSessionService,
  ) {}

  onApplicationBootstrap() {
    const server: Server = this.adapterHost.httpAdapter.getHttpServer();
    this.wss = new WebSocketServer({
      server,
      path: GatewayRoutes.connect,
      maxPayload: 64 * 1024,
    });
    this.wss.on('connection', (ws, req) => {
      const conn = new GatewayConnection(
        {
          send: (text) => ws.send(text),
          close: (code, reason) => ws.close(code, reason),
        },
        this.sessions,
        this.authenticate,
        (userId) => this.servers.summariesFor(userId),
        this.presence,
        (userId) => this.settings.get(userId),
        (userId) => this.friends.list(userId),
        (userId) => this.readStates.forReady(userId),
        (userId) => this.dms.openFor(userId),
        this.voice,
        (userId) => this.rooms.ready(userId),
      );
      ws.on('message', (data, isBinary) => {
        // A binary frame is not JSON text: receive('') closes with 4002.
        void conn.receive(isBinary ? '' : data.toString());
      });
      ws.on('close', () => conn.closed());
      ws.on('error', () => conn.closed());

      const version = new URL(
        req.url ?? '/',
        'http://gateway',
      ).searchParams.get('v');
      if (version !== String(GATEWAY_VERSION))
        return conn.close(GatewayCloseCode.UNSUPPORTED_VERSION);
      conn.open();
    });
  }

  onApplicationShutdown() {
    for (const ws of this.wss?.clients ?? []) ws.terminate();
    this.wss?.close();
  }

  // Same checks as AuthGuard, answered as a close code instead of an HTTP error.
  private readonly authenticate: Authenticate = async (token) => {
    let claims;
    try {
      claims = await this.tokens.verifyAccess(token);
    } catch {
      return { ok: false, reason: null };
    }
    const state = await this.authSessions.findAuthState(claims.sessionId);
    if (!state || state.userId !== claims.userId)
      return { ok: false, reason: null };
    if (state.revokedAt)
      return {
        ok: false,
        reason: SessionEndReason.safeParse(state.revokeReason).data ?? null,
      };
    const user = await this.users.findById(claims.userId);
    if (!user) return { ok: false, reason: null };
    return {
      ok: true,
      userId: claims.userId,
      authSessionId: claims.sessionId,
      user: toCurrentUser(user),
    };
  };
}
