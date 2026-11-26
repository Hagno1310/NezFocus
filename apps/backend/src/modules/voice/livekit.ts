import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
  WebhookReceiver,
  type WebhookEvent,
} from 'livekit-server-sdk';
import type { Env } from '../../config/env.js';

const TOKEN_TTL = '10m'; // SRS 5.5: only needs to be valid when connecting

// SRS 5.5: room of a voice channel; `call:<id>` comes with P3-B6.2 (#156).
export const roomOf = (channelId: bigint) => `voice:${channelId}`;
export const channelOfRoom = (room: string) =>
  room.startsWith('voice:') ? BigInt(room.slice('voice:'.length)) : null;

export type Publish = { mic: boolean; camera: boolean };

const sources = (p: Publish) => [
  ...(p.mic ? [TrackSource.MICROPHONE] : []),
  ...(p.camera ? [TrackSource.CAMERA] : []),
];

// The LiveKit Server API the voice module needs; tests swap in a recorder.
export abstract class LiveKitRooms {
  abstract remove(room: string, identity: string): Promise<void>;
  // REQ-VC-04: what this participant may publish from now on; a dropped source stops at the SFU.
  abstract allow(room: string, identity: string, p: Publish): Promise<void>;
  abstract close(room: string): Promise<void>;
}

@Injectable()
export class ServerApiRooms extends LiveKitRooms {
  private readonly logger = new Logger('LiveKitRooms');
  private readonly client: RoomServiceClient;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.client = new RoomServiceClient(
      config.get('LIVEKIT_API_URL', { infer: true }),
      config.get('LIVEKIT_API_KEY', { infer: true }),
      config.get('LIVEKIT_API_SECRET', { infer: true }),
    );
  }

  // Gone already (left, room closed) is the outcome we wanted, so errors are only logged.
  async remove(room: string, identity: string) {
    await this.client
      .removeParticipant(room, identity)
      .catch((err: unknown) =>
        this.logger.warn(`remove ${identity}: ${String(err)}`),
      );
  }

  async allow(room: string, identity: string, p: Publish) {
    const canPublishSources = sources(p);
    await this.client
      .updateParticipant(room, identity, undefined, {
        canPublish: canPublishSources.length > 0,
        canPublishSources,
        canSubscribe: true,
        canPublishData: false,
      })
      .catch((err: unknown) =>
        this.logger.warn(`allow ${identity}: ${String(err)}`),
      );
  }

  async close(room: string) {
    await this.client
      .deleteRoom(room)
      .catch((err: unknown) =>
        this.logger.warn(`close ${room}: ${String(err)}`),
      );
  }
}

// Signing and checking need no network, so tests use the real thing with the dev keys.
@Injectable()
export class LiveKitKeys {
  readonly url: string;
  private readonly key: string;
  private readonly secret: string;
  private readonly receiver: WebhookReceiver;

  constructor(config: ConfigService<Env, true>) {
    this.url = config.get('LIVEKIT_URL', { infer: true });
    this.key = config.get('LIVEKIT_API_KEY', { infer: true });
    this.secret = config.get('LIVEKIT_API_SECRET', { infer: true });
    this.receiver = new WebhookReceiver(this.key, this.secret);
  }

  // SRS 5.5 grant: one room, identity = user id, publish by SPEAK / VIDEO, never data.
  token(userId: bigint, room: string, p: Publish) {
    const at = new AccessToken(this.key, this.secret, {
      identity: userId.toString(),
      ttl: TOKEN_TTL,
    });
    const canPublishSources = sources(p);
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: canPublishSources.length > 0,
      canPublishSources,
      canSubscribe: true,
      canPublishData: false,
    });
    return at.toJwt();
  }

  // undefined = bad or missing signature (SRS 5.5: webhooks are verified).
  webhook(
    body: string,
    auth: string | undefined,
  ): Promise<WebhookEvent | undefined> {
    return this.receiver.receive(body, auth).catch(() => undefined);
  }
}
