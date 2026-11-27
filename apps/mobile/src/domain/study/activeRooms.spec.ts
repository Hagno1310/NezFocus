import { describe, expect, it } from 'vitest';
import { activeRooms, keepRoomOrder, type RoomCandidate } from './activeRooms';
import { session } from './roomSessions.fixture';

// Spec 04 › Sắp xếp sample (21:47): An ("1") sits in Phòng học im lặng; friends 2, 3, 4, 5, 6, 7.
const room = (
  channelId: string,
  people: string[],
  started: string,
  extra: Partial<RoomCandidate> = {},
): RoomCandidate => ({
  session: session({
    id: `s${channelId}`,
    channel_id: channelId,
    started_at: `2026-10-18T${started}:00.000Z`,
  }),
  people,
  canJoin: true,
  ...extra,
});

const friends = new Set(['2', '3', '4', '5', '6', '7']);

describe('S-STUDY-01 › Đang học lúc này (SRS 3.1, spec 04 › Sắp xếp)', () => {
  const rooms = [
    room('goc', ['a', 'b', 'c', 'd'], '13:00'), // Góc học khuya, 0 friends, 4
    room('luyen', ['e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'], '14:20'), // 0 friends, 8
    room('thao-luan', ['6', 'm', 'n'], '14:30'), // Tuấn + 2
    room('on-tap', ['7', 'o', 'p', 'q', 'r'], '14:00'), // Minh + 4
    room('im-lang', ['1', '2', '3', '4', '5', 'a1', 'a2', 'a3', 'a4'], '14:11'),
  ];

  it('mine → more friends → more people → started earlier', () => {
    expect(
      activeRooms(rooms, '1', 'im-lang', friends).map((r) => r.channelId),
    ).toEqual(['im-lang', 'on-tap', 'thao-luan', 'luyen', 'goc']);
  });

  it('only rooms I may view and join (VIEW_CHANNEL + CONNECT)', () => {
    const list = activeRooms(
      [...rooms.slice(0, 2), room('khoa', ['x'], '14:00', { canJoin: false })],
      '1',
      null,
      friends,
    );
    expect(list.map((r) => r.channelId)).toEqual(['luyen', 'goc']);
  });

  it('friends and the others: "Bình, Chi và 6 người" (me and named friends not counted)', () => {
    const [mine] = activeRooms(rooms, '1', 'im-lang', friends);
    expect(mine).toMatchObject({
      mine: true,
      friends: ['2', '3', '4', '5'],
      people: 8,
    });
  });

  it('while viewing: order kept, an ended room drops out, a new one goes last', () => {
    const first = ['im-lang', 'on-tap', 'thao-luan'];
    expect(
      keepRoomOrder(first, ['new', 'thao-luan', 'im-lang', 'goc']),
    ).toEqual(['im-lang', 'thao-luan', 'new', 'goc']);
    expect(keepRoomOrder(null, ['b', 'a'])).toEqual(['b', 'a']);
  });
});
