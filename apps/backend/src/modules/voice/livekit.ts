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

export type Publishable = { mic: boolean; camera: boolean };

// SRS 5.5 grant: publish by SPEAK / VIDEO, always subscribe, never data.
export const publishGrant = (p: Publishable) => {
  const canPublishSources = [
    ...(p.mic ? [TrackSource.MICROPHONE] : []),
    ...(p.camera ? [TrackSource.CAMERA] : []),
  ];
  return {
    canPublish: canPublishSources.length > 0,
    canPublishSources,
    canSubscribe: true,
    canPublishData: false,
  };
};

// The LiveKit Server API the voice module needs; tests swap in a recorder.
export abstract class LiveKitRooms {
  abstract remove(room: string, identity: string): Promise<void>;
  abstract close(room: string): Promise<void>;
  // SRS 5.5 UpdateParticipant: what the person may publish from now on (REQ-VC-04).
  abstract setPublish(
    room: string,
    identity: string,
    publish: Publishable,
  ): Promise<void>;
  // SRS 5.5 MutePublishedTrack of their microphone (REQ-VC-04 AC1).
  abstract muteMic(room: string, identity: string): Promise<void>;
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

  async close(room: string) {
    await this.client
      .deleteRoom(room)
      .catch((err: unknown) =>
        this.logger.warn(`close ${room}: ${String(err)}`),
      );
  }

  // Not in LiveKit right now (away): the token of their next join carries the same rule.
  async setPublish(room: string, identity: string, publish: Publishable) {
    await this.client
      .updateParticipant(room, identity, { permission: publishGrant(publish) })
      .catch((err: unknown) =>
        this.logger.warn(`permission ${identity}: ${String(err)}`),
      );
  }

  async muteMic(room: string, identity: string) {
    try {
      const who = await this.client.getParticipant(room, identity);
      for (const track of who.tracks)
        if (track.source === TrackSource.MICROPHONE && !track.muted)
          await this.client.mutePublishedTrack(room, identity, track.sid, true);
    } catch (err) {
      this.logger.warn(`mute ${identity}: ${String(err)}`);
    }
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

  // SRS 5.5: one room, identity = user id.
  token(userId: bigint, room: string, p: Publishable) {
    const at = new AccessToken(this.key, this.secret, {
      identity: userId.toString(),
      ttl: TOKEN_TTL,
    });
    at.addGrant({ roomJoin: true, room, ...publishGrant(p) });
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
