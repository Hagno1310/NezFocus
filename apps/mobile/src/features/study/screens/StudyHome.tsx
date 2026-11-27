import type { CycleConfig, StudyStatsResponse } from '@nezfocus/shared';
import { ChevronDown, ChevronRight, Play } from 'lucide-react-native';
import { useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { homeStore } from '../../../domain/servers/homeStore';
import { endingOf, timerOf, type SoloTimer } from '../../../domain/study/solo';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import {
  radius,
  size,
  space,
  touchSlop,
  useTheme,
} from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { EmptyState, Skeleton } from '../../../shared/ui/Feedback';
import { PhaseBadge } from '../../../shared/ui/Focus';
import { Icon } from '../../../shared/ui/Icon';
import { StatText } from '../../../shared/ui/Stats';
import { Text } from '../../../shared/ui/Text';
import { CycleSheet } from '../components/CycleSheet';
import { RoomRows } from '../components/RoomRows';
import { useActiveRooms, type RoomRowData } from '../hooks/useActiveRooms';
import { roomSessionsStore } from '../../../domain/study/roomSessions';
import { voiceStore } from '../../../domain/voice/voiceSession';
import { Today } from '../components/Today';
import { WeekChart } from '../components/WeekChart';
import { cycleText, minutesText } from '../format';
import { FIRST_FOCUS, useBeginSolo } from '../hooks/useBeginSolo';
import { useNow, useSolo } from '../hooks/useSolo';
import { useRefreshStudy, useStudyStats } from '../hooks/useStudyStats';

// S-STUDY-01.
export function StudyHome({
  onOpenSolo,
  onAskNotifications,
  onOpenStats,
  onCreateServer,
  onShowRoom,
  onSeeAllRooms,
}: {
  onOpenSolo: () => void;
  onAskNotifications: () => void;
  onOpenStats: (date: string) => void;
  onCreateServer: () => void;
  onShowRoom: () => void;
  onSeeAllRooms: () => void;
}) {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const online = useOnline();
  const stats = useStudyStats('week');
  const refresh = useRefreshStudy();
  const [refreshing, setRefreshing] = useState(false);
  const { begin, cycle, setCycle, starting } = useBeginSolo({
    onOpenSolo,
    onAskNotifications,
  });

  const active = useActiveRooms();
  const pull = async () => {
    setRefreshing(true);
    active.resort();
    await refresh().finally(() => setRefreshing(false));
  };

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <Text variant="title-1" accessibilityRole="header" style={styles.title}>
        {t('tabs.study')}
      </Text>
      {/* 04 offline: the banner sits right under the tab title. */}
      <ConnectionBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={pull} />
        }
      >
        <Rooms
          online={online}
          rows={active.rows}
          onCreateServer={onCreateServer}
          onShowRoom={onShowRoom}
          onSeeAll={onSeeAllRooms}
        />
        <SoloBlock
          cycle={cycle}
          onChangeCycle={setCycle}
          onStart={(c) => void begin(c)}
          starting={starting}
          onOpen={onOpenSolo}
        />
        <WeekBlock
          stats={stats.data}
          online={online}
          onOpen={onOpenStats}
          onFirstFocus={() => void begin(FIRST_FOCUS, false)}
        />
      </ScrollView>
    </View>
  );
}

const ROWS_MAX = 3; // spec 04 › Sắp xếp: then "Xem tất cả ({N})"

function Rooms({
  online,
  rows,
  onCreateServer,
  onShowRoom,
  onSeeAll,
}: {
  online: boolean;
  rows: RoomRowData[];
  onCreateServer: () => void;
  onShowRoom: () => void;
  onSeeAll: () => void;
}) {
  const { t } = useTranslation();
  // null until READY lists the servers (S-HOME-02: an empty list means no server).
  const servers = useStore(homeStore, (s) => s.servers);
  const shown = online && rows.length > 0;
  return (
    <View style={styles.section}>
      <View style={styles.roomsHead}>
        <Text variant="headline" style={styles.flex}>
          {t('study.home.rooms')}
        </Text>
        {shown && (
          <Text variant="label" color="text-secondary">
            {t('study.home.roomsCount', { n: rows.length })}
          </Text>
        )}
      </View>
      {shown ? (
        <>
          <RoomRows rows={rows.slice(0, ROWS_MAX)} onShowRoom={onShowRoom} />
          {rows.length > ROWS_MAX && (
            <Button
              variant="text"
              size="S"
              label={t('study.home.seeAll', { n: rows.length })}
              onPress={onSeeAll}
            />
          )}
        </>
      ) : !online ? (
        <Text color="text-secondary">{t('study.home.roomsOffline')}</Text>
      ) : servers === null ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={size.settingsRow} />
          ))}
        </View>
      ) : servers.length === 0 ? (
        <EmptyState
          title={t('study.home.noServerTitle')}
          action={{
            label: t('study.home.createServer'),
            variant: 'secondary',
            onPress: onCreateServer,
          }}
        />
      ) : (
        <EmptyState
          title={t('study.home.noRoomsTitle')}
          body={t('study.home.noRoomsBody')}
        />
      )}
    </View>
  );
}

// C-16 `list`: minutes only (the MiniPlayer on the same screen counts seconds).
function soloLine(t: TFunction, timer: SoloTimer) {
  const minutes = Math.floor(timer.remainingMs / 60_000);
  if (timer.status === 'paused') return t('study.phase.pausedShort');
  if (timer.status === 'waiting')
    return t('study.home.waitingLeft', { minutes });
  const phase = t(`study.phase.${timer.phase}`);
  return minutes
    ? t('study.home.left', { phase, minutes })
    : t('study.home.leftUnder', { phase });
}

function SoloBlock({
  cycle,
  onChangeCycle,
  onStart,
  starting,
  onOpen,
}: {
  cycle: CycleConfig;
  onChangeCycle: (c: CycleConfig) => void;
  onStart: (c?: CycleConfig) => void;
  starting: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const snap = useSolo();
  const now = useNow(1000);
  const [choosing, setChoosing] = useState(false);
  const inRoom = useRoomWithSession();
  const timer = snap && !endingOf(snap) ? timerOf(snap, now) : null;
  // 04 › Khối Solo: at 200% "Bắt đầu" goes under the text, full width.
  const stacked = fontScale >= 1.5;
  const cycleLabel = cycle.long_break_min
    ? t('study.cycleLong', {
        cycle: cycleText(cycle),
        long: cycle.long_break_min,
      })
    : t('study.cycle', { cycle: cycleText(cycle) });

  // `in-room-solo-blocked` (40903): one Focus Session at a time; the button goes under the cycle.
  const blocked = !timer && inRoom !== null;
  const button = timer ? (
    <Button
      variant="secondary"
      size="S"
      label={t('study.open')}
      onPress={onOpen}
    />
  ) : (
    <Button
      icon={Play}
      label={t('study.start')}
      loading={starting}
      fullWidth={stacked}
      disabled={blocked}
      onPress={() => onStart()}
    />
  );

  // Frame S-STUDY-01 › Solo: one row [title + cycle | button], filled surface-1.
  return (
    <View
      style={[
        styles.solo,
        // `in-room-solo-blocked` (frame): the off button goes under the cycle line.
        (stacked || blocked) && styles.stacked,
        { borderColor: colors.border, backgroundColor: colors['surface-1'] },
      ]}
    >
      {timer ? (
        <View style={[styles.soloInfo, !stacked && !blocked && styles.flex]}>
          <Text weight="600">{t('study.solo')}</Text>
          <PhaseBadge
            phase={timer.phase}
            state={timer.status}
            size="S"
            label={soloLine(t, timer)}
          />
        </View>
      ) : (
        // Title and cycle line form one control: the line alone is too short for 48 (SRS 3.5).
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cycleLabel}
          onPress={() => setChoosing(true)}
          hitSlop={touchSlop(INFO_HEIGHT)}
          style={[styles.soloInfo, !stacked && !blocked && styles.flex]}
        >
          <Text weight="600">{t('study.solo')}</Text>
          <View style={styles.cycleRow}>
            <Text
              color="text-secondary"
              numberOfLines={2}
              style={styles.shrink}
            >
              {cycleLabel}
            </Text>
            <Icon as={ChevronDown} size="base" color="text-secondary" />
          </View>
        </Pressable>
      )}
      {blocked ? (
        <View style={styles.blocked}>
          {button}
          <Text variant="label" color="text-secondary">
            {t('room.inRoomSolo', { name: inRoom })}
          </Text>
        </View>
      ) : (
        button
      )}
      <CycleSheet
        key={String(choosing)}
        visible={choosing}
        mode="start"
        initial={cycle}
        loading={starting}
        onKeep={onChangeCycle}
        onDismiss={() => setChoosing(false)}
        onSubmit={(c) => {
          setChoosing(false);
          onStart(c);
        }}
      />
    </View>
  );
}

function WeekBlock({
  stats,
  online,
  onOpen,
  onFirstFocus,
}: {
  stats: StudyStatsResponse | undefined;
  online: boolean;
  onOpen: (date: string) => void;
  onFirstFocus: () => void;
}) {
  const { t } = useTranslation();
  if (!stats)
    return online ? (
      <View style={styles.skeletons}>
        <Skeleton width="60%" height={40} />
        <Skeleton width="100%" height={120} />
      </View>
    ) : (
      <EmptyState title={t('study.stats.offline')} />
    );
  // never-studied: the only primary button on the screen stays Solo's "Bắt đầu".
  if (!stats.first_date)
    return (
      <EmptyState
        mascot
        title={t('study.home.neverTitle')}
        body={t('study.home.neverBody')}
        action={{
          label: t('study.home.neverStart'),
          variant: 'secondary',
          onPress: onFirstFocus,
        }}
      />
    );
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(stats.today)}
      style={styles.week}
    >
      <View style={styles.row}>
        <Text variant="headline" style={styles.flex}>
          {t('study.home.week')}
        </Text>
        <Icon as={ChevronRight} size="lg" color="text-secondary" />
      </View>
      <View style={styles.streakRow}>
        <StatText
          text={`${stats.current_streak_days} ${t('study.streakUnit')}`}
        />
        <StatText text={minutesText(t, stats.total_minutes)} />
      </View>
      {/* STUDY-03 AC2 streak-zero: "0" plus a neutral line, no mascot. */}
      {!stats.current_streak_days && (
        <Text color="text-secondary">{t('study.streakZero')}</Text>
      )}
      <Today minutes={stats.today_minutes} />
      <WeekChart days={stats.days} today={stats.today} />
    </Pressable>
  );
}

// Frame S-STUDY-01 › Solo › Info at 100%.
const INFO_HEIGHT = 42;

// The room I sit in when it has a Room Session (S-STUDY-01 `in-room-solo-blocked`).
function useRoomWithSession() {
  const call = useStore(voiceStore, (v) =>
    v.call?.phase === 'in' ? v.call : null,
  );
  const running = useStore(
    roomSessionsStore,
    (s) => !!call && !!s.byChannel[call.channelId],
  );
  const name = useStore(homeStore, (s) =>
    call
      ? (s.channels[call.serverId]?.find((c) => c.id === call.channelId)
          ?.name ?? '')
      : '',
  );
  return running ? name : null;
}

const styles = StyleSheet.create({
  roomsHead: { flexDirection: 'row', alignItems: 'baseline' },
  // Frame `in-room-solo-blocked`: the off button on its own row, the reason under it.
  blocked: { width: '100%', gap: space[2], alignItems: 'flex-start' },
  screen: { flex: 1 },
  title: { paddingHorizontal: space[3], paddingVertical: space[2] },
  content: { padding: space[3], gap: space[3] },
  section: { gap: space[2] },
  week: { gap: 12 },
  skeletons: { gap: space[2] },
  solo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: size.hairline,
    borderRadius: radius.button,
    padding: space[3],
    gap: 12,
  },
  soloInfo: { gap: 2 },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  cycleRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  row: { flexDirection: 'row', alignItems: 'center' },
  streakRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: space[5],
    rowGap: space[1],
  },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
});
