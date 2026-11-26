import type { VoiceState } from '@nezfocus/shared';
import type { WebhookEvent } from 'livekit-server-sdk';
import { fixedClock, type Clock } from '../../common/clock.js';
import type { EventPublisher } from '../gateway/event-publisher.js';
import type { PresenceSink } from '../gateway/presence.service.js';
import type { PermissionService } from '../permissions/permission.service.js';
import type { ServersRepository } from '../servers/servers.repository.js';
import { ChannelTypeCode } from '../servers/servers.schema.js';
import type { LiveKitKeys, LiveKitRooms } from './livekit.js';
import { MemoryVoiceSeats } from './voice-seats.js';
import type { VoiceRepository } from './voice.repository.js';
import { VoiceRoomsService } from './voice-rooms.service.js';

const ROOM = 10n;
const SERVER = 1n;
const BINH = { userId: 2n, authSessionId: 20n };

// REQ-VC-01 "Mất kết nối không phải rời phòng": a seat waits 3 minutes for its owner.
describe('VoiceRoomsService away seats', () => {
  const setup = async (failRemoveOf?: string) => {
    const clock = fixedClock();
    const sent: { to: string; d: VoiceState }[] = [];
    const removed: string[] = [];
    const voice = new VoiceRoomsService(
      new MemoryVoiceSeats(),
      {
        remove: async (room: string, identity: string) => {
          if (identity === failRemoveOf) throw new Error('LiveKit down');
          removed.push(room);
        },
      } as unknown as LiveKitRooms,
      {} as LiveKitKeys,
      {
        findChannel: async () => ({
          id: ROOM,
          serverId: SERVER,
          type: ChannelTypeCode.voice,
        }),
      } as unknown as ServersRepository,
      { can: async () => true } as unknown as PermissionService,
      {
        toChannel: async (_: bigint, __: string, d: VoiceState) =>
          void sent.push({ to: 'room', d }),
        toLogin: async (_: bigint, __: string, d: VoiceState) =>
          void sent.push({ to: 'device', d }),
      } as unknown as EventPublisher,
      { modMuted: async () => false } as unknown as VoiceRepository,
      clock as Clock,
      { voiceChanged: async () => {} } as unknown as PresenceSink,
    );
    await voice.update(BINH, {
      channel_id: ROOM.toString(),
      self_mute: true,
      self_video: false,
    });
    // createdAt in seconds, as LiveKit sends it; default: now.
    const left = (disconnectReason?: number, createdAt?: number) =>
      voice.webhook({
        event: 'participant_left',
        createdAt: BigInt(
          createdAt ?? Math.floor(clock.now().getTime() / 1000),
        ),
        room: { name: `voice:${ROOM}` },
        participant: { identity: '2', disconnectReason },
      } as unknown as WebhookEvent);
    return { voice, clock, sent, removed, left };
  };

  it('keeps the seat 3 minutes after the connection drops, then lets it go', async () => {
    const { voice, clock, sent, removed, left } = await setup();
    await left(0); // the phone dropped off, nobody pressed Rời phòng
    expect(sent.at(-1)?.d).toMatchObject({ channel_id: '10', away: true });

    clock.advance(179);
    await voice.expireAway();
    expect(await voice.seatOf(BINH.userId)).not.toBeNull();

    clock.advance(1);
    await voice.expireAway();
    expect(await voice.seatOf(BINH.userId)).toBeNull();
    expect(sent.at(-2)).toMatchObject({ to: 'room', d: { channel_id: null } });
    expect(sent.at(-1)).toMatchObject({ to: 'device', d: { reason: 'left' } });
    expect(removed).toEqual([`voice:${ROOM}`]);
  });

  it('one person LiveKit fails to remove does not keep the others in the room', async () => {
    const { voice, clock, left } = await setup('2');
    const CHI = { userId: 3n, authSessionId: 30n };
    await voice.update(CHI, {
      channel_id: ROOM.toString(),
      self_mute: true,
      self_video: false,
    });
    await left(0);
    await voice.webhook({
      event: 'participant_left',
      createdAt: BigInt(Math.floor(clock.now().getTime() / 1000)),
      room: { name: `voice:${ROOM}` },
      participant: { identity: '3', disconnectReason: 0 },
    } as unknown as WebhookEvent);
    clock.advance(180);
    await voice.expireAway();
    expect(await voice.seatOf(CHI.userId)).toBeNull();
  });

  it('coming back within 3 minutes keeps joined_at (Participation liền mạch)', async () => {
    const { voice, clock, sent, left } = await setup();
    const joinedAt = sent[0]!.d.joined_at;
    await left(0);
    clock.advance(120);
    await voice.update(BINH, {
      channel_id: ROOM.toString(),
      self_mute: true,
      self_video: false,
    });
    clock.advance(120);
    await voice.expireAway();
    expect(sent.at(-1)?.d).toMatchObject({ away: false, joined_at: joinedAt });
    expect(await voice.seatOf(BINH.userId)).not.toBeNull();
  });

  it('only op 4 leaves now: a client-initiated drop (switching rooms) is away', async () => {
    const { voice, sent, left } = await setup();
    await left(1);
    expect(sent.at(-1)?.d).toMatchObject({ channel_id: '10', away: true });
    await voice.update(BINH, {
      channel_id: null,
      self_mute: true,
      self_video: false,
    });
    expect(await voice.seatOf(BINH.userId)).toBeNull();
  });

  it('ignores the old device dropped for a duplicate identity, and webhooks older than op 4', async () => {
    const { voice, clock, sent, left } = await setup();
    await left(2);
    clock.advance(10);
    await voice.update(BINH, {
      channel_id: ROOM.toString(),
      self_mute: false,
      self_video: false,
    });
    await left(0, Math.floor(clock.now().getTime() / 1000) - 5);
    expect(sent.every((x) => x.d.away === false)).toBe(true);
  });

  it('leaving twice (sweeper and op 4 together) sends one leave', async () => {
    const { voice, sent } = await setup();
    const leave = { channel_id: null, self_mute: true, self_video: false };
    await Promise.all([
      voice.update(BINH, leave),
      voice.disconnect(BINH.userId, 'any', 'kicked'),
    ]);
    expect(sent.filter((x) => x.d.channel_id === null)).toHaveLength(2); // room + device
  });
});
