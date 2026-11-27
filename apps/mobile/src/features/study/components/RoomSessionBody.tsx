import {
  myFocusedSeconds,
  roomTimer,
  type FocusSessionState,
  type RoomTimer,
} from '@nezfocus/shared';
import {
  Flame,
  Timer,
  User,
  UserPlus,
  UserX,
  Video,
} from 'lucide-react-native';
import type { TFunction } from 'i18next';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { create } from 'zustand';
import { ParticipantVideo } from '../../../data/voice/VoiceVideo';
import { todayMinutesNow } from '../../../domain/study/roomSessions';
import {
  countLine,
  cycleLines,
  roleChip,
  roomNotice,
  subLine,
  type RoomNotice,
  type CycleLine,
  type RoomViewInput,
  type SubLine,
} from '../../../domain/study/roomView';
import { ringSeats } from '../../../domain/voice/voiceRooms';
import { size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { ChipStatus } from '../../../shared/ui/ChipStatus';
import {
  FocusTimer,
  FocusTimerCompact,
  phaseRoomColor,
} from '../../../shared/ui/Focus';
import { Mascot } from '../../../shared/ui/Mascot';
import {
  ParticipantTile,
  RingMore,
  RingSeat,
  SeatRing,
  VideoGrid,
  gridTileWidth,
  seatRadius,
} from '../../../shared/ui/Room';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import type { RoomTile } from '../../voice/hooks/useVoiceRoom';
import { cycleText, hhmm } from '../format';
import { useStudyStats } from '../hooks/useStudyStats';

const BODY_X = space[3];
const TOAST_MS = 4000; // C-24 toast without an action
const FIRST_MINUTE_S = 60;

// C-06 › Vòng / Lưới: each person's own choice, kept on the phone; Vòng the first time.
// ponytail: kept for the app run only; khi op-sqlite lands (P2-A3.3 #101): store it there.
export const useRoomViewMode = create<{
  mode: 'ring' | 'grid';
  set: (mode: 'ring' | 'grid') => void;
}>((set) => ({ mode: 'ring', set: (mode) => set({ mode }) }));

const time = (iso: string) => hhmm(new Date(iso));

// S-ROOM-02 between the header and the button row: the `not-joined` preview or the room in a
// session (ring or grid).
export function RoomSessionBody({
  session,
  offsetMs,
  now,
  meId,
  joined,
  canManage,
  syncing,
  tiles,
  nameOf,
  onToastTop,
  onMore,
  otherSession = false,
}: {
  session: FocusSessionState;
  offsetMs: number;
  now: number;
  meId: string;
  joined: boolean;
  canManage: boolean;
  syncing: boolean;
  tiles: RoomTile[];
  nameOf: (userId: string) => string;
  onToastTop: (y: number) => void; // Toasts sit under the chip (spec 03 › Toast)
  onMore: () => void;
  otherSession?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { mode, set: setMode } = useRoomViewMode();
  const stats = useStudyStats('week').data;
  const timer = roomTimer(session, offsetMs, now);
  const seconds = myFocusedSeconds(session, offsetMs, now);
  const joinedAt = useJoinedAt(joined, session, offsetMs, now);
  const todayMinutes = todayMinutesNow(
    stats?.today_minutes ?? 0,
    session,
    offsetMs,
    now,
  );
  useStreakToast(joined && timer.phase === 'focus', todayMinutes, stats);
  const notice = useNoticeToast(joined ? session : null, meId, nameOf);
  // `host-transferred`: "Bình đã rời phòng" until the phase changes.
  const phaseKey = `${timer.round}:${timer.phase}`;
  const [hostLeft, setHostLeft] = useState<{ id: string; key: string } | null>(
    null,
  );
  const leftHost =
    notice && 'from' in notice && notice.from ? notice.from : null;
  if (leftHost && hostLeft?.id !== leftHost)
    setHostLeft({ id: leftHost, key: phaseKey });

  const people = joined ? tiles : tiles.filter((x) => !x.self);
  const v: RoomViewInput = {
    session,
    timer,
    meId,
    joined,
    canManage,
    others: people.filter((x) => !x.self).length,
    syncing,
    justJoined:
      joinedAt !== null &&
      now - joinedAt > TOAST_MS &&
      (seconds ?? 0) < FIRST_MINUTE_S,
    todayMinutes,
    seated: new Set(tiles.map((x) => x.userId)),
    hostLeft: hostLeft?.key === phaseKey ? hostLeft.id : null,
  };
  const chip = roleChip(v);
  const lines = cycleLines(v).map((l) => cycleLineText(t, l, nameOf));
  const count = countLine(v);
  const sub = subLine(v);
  const paused = timer.status === 'paused';
  const phaseLabel = t(`study.phase.${timer.phase}`);
  const label = paused
    ? t('room.pausedLabel', { phase: phaseLabel })
    : phaseLabel;
  const a11y = t('study.a11yTimer', {
    phase: label,
    round: timer.round,
    minutes: Math.ceil(timer.remainingMs / 60_000),
  });
  const cameras = people.filter((x) => x.camera).length;
  const alone = count.key === 'alone';
  const grid = joined && mode === 'grid';
  // DESIGN.md › Mascot: only while a break runs, never in focus.
  const mascot =
    timer.phase !== 'focus' && !paused ? (
      <Mascot
        mood={timer.phase === 'long_break' ? 'happy' : 'sleepy'}
        size={size.mascotRing}
      />
    ) : undefined;
  const breath = useBreath(session.id, timer);
  const { seated, more } = ringSeats(people.map((x) => x.userId));
  const byId = new Map(people.map((x) => [x.userId, x]));
  const behind = colors[phaseRoomColor[timer.phase]];

  const header = joined && (
    <View
      style={styles.top}
      onLayout={(e: LayoutChangeEvent) =>
        onToastTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height)
      }
    >
      {chip && (
        <View style={styles.chip}>
          <ChipStatus
            icon={
              chip.kind === 'me' ? Timer : chip.kind === 'none' ? UserX : User
            }
            label={
              chip.kind === 'other'
                ? t('room.chip.other', { name: nameOf(chip.userId) })
                : t(`room.chip.${chip.kind}`)
            }
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.body}>
      {header}
      {joined && (
        <SegmentedControl
          segments={[
            { key: 'ring', label: t('room.viewRing') },
            {
              key: 'grid',
              label: t('room.viewGrid'),
              ...(cameras > 0 && !alone && { icon: Video, count: cameras }),
            },
          ]}
          value={mode}
          onChange={setMode}
        />
      )}
      {grid ? (
        <ScrollView contentContainerStyle={styles.gridBody}>
          <FocusTimerCompact
            phase={timer.phase}
            state={paused ? 'paused' : 'running'}
            leftMs={timer.remainingMs}
            label={label}
            muted={syncing}
            accessibilityLabel={a11y}
            line={t(cameras ? 'room.gridCameras' : 'room.grid', {
              round: timer.round,
              n: people.length,
              cameras,
            })}
          />
          <VideoGrid>
            {people.map((tile) => (
              <ParticipantTile
                key={tile.userId}
                name={tile.name}
                avatar={tile.avatar}
                self={tile.self}
                mic={tile.mic}
                speaking={tile.speaking}
                away={tile.away}
                poorNetwork={tile.poorNetwork}
                width={gridTileWidth(width - BODY_X * 2, people.length)}
                video={
                  tile.camera ? (
                    <ParticipantVideo userId={tile.userId} mirror={tile.self} />
                  ) : undefined
                }
              />
            ))}
          </VideoGrid>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.ringBody}>
          <SeatRing
            radius={seatRadius(width)}
            breath={breath}
            center={
              <FocusTimer
                phase={timer.phase}
                state={paused ? 'paused' : 'running'}
                leftMs={timer.remainingMs}
                totalMs={timer.totalMs}
                label={label}
                lines={lines}
                long={timer.long}
                muted={syncing}
                minutesText={
                  otherSession
                    ? Math.floor(timer.remainingMs / 60_000)
                      ? t('room.minutesLeft', {
                          n: Math.floor(timer.remainingMs / 60_000),
                        })
                      : t('room.minutesLeftUnder')
                    : undefined
                }
                mascot={mascot}
                accessibilityLabel={a11y}
              />
            }
            seats={[
              ...seated.map((id) => {
                const x = byId.get(id)!;
                return {
                  key: id,
                  node: (
                    <RingSeat
                      name={x.name}
                      avatar={x.avatar}
                      self={x.self}
                      mic={x.mic}
                      camera={x.camera}
                      speaking={x.speaking}
                      away={x.away}
                      behind={behind}
                    />
                  ),
                };
              }),
              ...(more
                ? [
                    {
                      key: 'more',
                      node: <RingMore count={more} onPress={onMore} />,
                    },
                  ]
                : []),
            ]}
          />
          <Text weight="600" style={styles.center}>
            {countText(t, count)}
          </Text>
          {joined && (
            <Button
              variant={alone ? 'secondary' : 'text'}
              size="S"
              icon={UserPlus}
              label={t('room.invite')}
              // ponytail: the Android share sheet (S-HOME-07 `room`) is P3-B6.5 (#159).
              onPress={() => {}}
            />
          )}
          {sub && (
            <Text variant="label" color="text-secondary" style={styles.center}>
              {subText(t, sub, nameOf)}
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function cycleLineText(
  t: TFunction,
  l: CycleLine,
  nameOf: (id: string) => string,
) {
  switch (l.key) {
    case 'round':
      return t('study.line.round', {
        round: l.round,
        next:
          l.next === 'long_break'
            ? t('study.next.long_break')
            : t('study.next.short_break'),
        time: time(l.at),
      });
    case 'breakEnds':
      return t('room.line.breakEnds', { time: time(l.at) });
    case 'pausedBy':
      return t('room.line.pausedBy', { name: nameOf(l.userId) });
    case 'pending':
      return t('study.line.pending', { cycle: cycleText(l.cycle) });
    default:
      return t(`room.line.${l.key}`);
  }
}

function countText(t: TFunction, c: ReturnType<typeof countLine>) {
  switch (c.key) {
    case 'focusWith':
      return t('room.count.focusWith', { n: c.n });
    case 'waitingWith':
      return t('room.count.waitingWith', { n: c.n });
    case 'focusing':
      return t('room.count.focusing', { n: c.n });
    default:
      return t(`room.count.${c.key}`);
  }
}

function subText(t: TFunction, s: SubLine, nameOf: (id: string) => string) {
  switch (s.key) {
    case 'today':
      return t('room.sub.today', { minutes: s.minutes });
    case 'startedAt':
    case 'joinedAt':
      return t(`room.sub.${s.key}`, { time: time(s.at) });
    case 'stretch':
      return s.minutes < 1
        ? t('room.sub.stretchUnder')
        : t('room.sub.stretch', { minutes: s.minutes });
    case 'roundDone':
      return t('room.sub.roundDone', { round: s.round, time: time(s.at) });
    case 'pausedNote':
      return t('study.line.paused');
    case 'hostLeft':
      return t('room.sub.hostLeft', { name: nameOf(s.userId) });
    default:
      return t('room.sub.noHost');
  }
}

// `just-joined`: sitting down in a running session → "Bạn đang được tính giờ từ 21:47" under
// the chip, once per stay; the time is kept for the `late-join` line after it.
// Told once per session for the app run: a remount (MiniPlayer, 💬, back) does not tell again.
const toldJoined = new Set<string>();
// A stay older than this is not a fresh sit-down (app reopened, `app-restart-rejoin`).
const FRESH_JOIN_MS = 10_000;

function useJoinedAt(
  joined: boolean,
  session: FocusSessionState,
  offsetMs: number,
  now: number,
) {
  const { t } = useTranslation();
  const [join, setJoin] = useState<{ at: number; since: string } | null>(null);
  const counting = session.me?.counting_since ?? null;
  if (!joined && join) setJoin(null);
  if (joined && counting && !toldJoined.has(session.id)) {
    toldJoined.add(session.id);
    // My own Start is not "just joined": only a stay that began after the session did, just now.
    const since = Date.parse(counting);
    if (
      since > Date.parse(session.started_at) &&
      now + offsetMs - since < FRESH_JOIN_MS
    )
      setJoin({ at: now, since: counting });
  }
  useEffect(() => {
    if (join)
      showToast({
        icon: Timer,
        message: t('room.justJoined', { time: time(join.since) }),
      });
  }, [join, t]);
  return join?.at ?? null;
}

function useNoticeToast(
  session: FocusSessionState | null,
  meId: string,
  nameOf: (userId: string) => string,
) {
  const { t } = useTranslation();
  const [seen, setSeen] = useState(session);
  const [notice, setNotice] = useState<RoomNotice | null>(null);
  if (seen !== session) {
    setSeen(session);
    setNotice(seen && session ? roomNotice(seen, session, meId) : null);
  }
  useEffect(() => {
    if (!notice) return;
    const name = (id: string | null) => (id ? nameOf(id) : '');
    showToast({
      message:
        notice.key === 'hostToOther'
          ? t('room.notice.hostToOther', { name: name(notice.to) })
          : notice.key === 'resumedBy'
            ? t('room.notice.resumedBy', { name: name(notice.by) })
            : notice.key === 'hostLeftToMe'
              ? t('room.notice.hostLeftToMe', { name: name(notice.from) })
              : t('room.notice.hostToMe'),
    });
    // Only a new notice, not a new nameOf.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice, t]);
  return notice;
}

// Edge `streak-reached` (STUDY-03 AC5): today's minutes reach 15 in the middle of a focus.
// ponytail: worked out here from the live minutes; the backend's STREAK_UPDATE only comes when
// the minutes are credited (end of the phase, or leaving), which is too late for this Toast.
const QUALIFIED_MINUTES = 15; // DEC-24: a day counts for the streak from 15 minutes

function useStreakToast(
  focusing: boolean,
  todayMinutes: number,
  stats: { today_minutes: number; current_streak_days: number } | undefined,
) {
  const { t } = useTranslation();
  // From the first minutes the stats know, so their arrival itself is not a crossing.
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (!stats) return;
    const before = prev.current;
    prev.current = todayMinutes;
    if (
      before === null ||
      !focusing ||
      before >= QUALIFIED_MINUTES ||
      todayMinutes < QUALIFIED_MINUTES
    )
      return;
    // Not yet counted for today when it was under 15 at the last credit.
    const days =
      stats.today_minutes >= QUALIFIED_MINUTES
        ? stats.current_streak_days
        : stats.current_streak_days + 1;
    showToast({ icon: Flame, message: t('room.streakReached', { days }) });
  }, [focusing, todayMinutes, stats, t]);
}

// "Cả phòng thở ra": a new phase reached while watching (not one slept through, 7.3.6 step 4).
const LIVE_MS = 2000;
function useBreath(sessionId: string, timer: RoomTimer) {
  const key = `${sessionId}:${timer.round}:${timer.phase}`;
  const [seen, setSeen] = useState(key);
  const [breath, setBreath] = useState(0);
  if (seen !== key) {
    setSeen(key);
    const elapsed = timer.totalMs - timer.remainingMs;
    if (timer.status === 'running' && elapsed < LIVE_MS) setBreath(breath + 1);
  }
  return breath;
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: space[3] },
  top: { gap: space[2] },
  chip: { flexDirection: 'row' },
  ringBody: { alignItems: 'center', gap: space[2], paddingBottom: space[3] },
  gridBody: { gap: space[3], paddingBottom: space[3] },
  center: { textAlign: 'center' },
});
