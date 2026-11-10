import type { CycleConfig, StudyStatsResponse } from '@nezfocus/shared';
import { ChevronDown, ChevronRight, Play } from 'lucide-react-native';
import { useState } from 'react';
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
import { Today } from '../components/Today';
import { WeekChart } from '../components/WeekChart';
import { cycleText, minutesText } from '../format';
import { FIRST_FOCUS, useBeginSolo } from '../hooks/useBeginSolo';
import { useNow, useSolo } from '../hooks/useSolo';
import { useRefreshStudy, useStudyStats } from '../hooks/useStudyStats';

// S-STUDY-01. "Đang học lúc này" has rooms only from P3-B3.7 (#212); until then it is
// `no-active-rooms` or `no-server`.
export function StudyHome({
  onOpenSolo,
  onAskNotifications,
  onOpenStats,
  onCreateServer,
}: {
  onOpenSolo: () => void;
  onAskNotifications: () => void;
  onOpenStats: (date: string) => void;
  onCreateServer: () => void;
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

  const pull = async () => {
    setRefreshing(true);
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
        <Rooms online={online} onCreateServer={onCreateServer} />
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

function Rooms({
  online,
  onCreateServer,
}: {
  online: boolean;
  onCreateServer: () => void;
}) {
  const { t } = useTranslation();
  // null until READY lists the servers (S-HOME-02: an empty list means no server).
  const servers = useStore(homeStore, (s) => s.servers);
  return (
    <View style={styles.section}>
      <Text variant="headline">{t('study.home.rooms')}</Text>
      {!online ? (
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
function soloLine(t: ReturnType<typeof useTranslation>['t'], timer: SoloTimer) {
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
  const timer = snap && !endingOf(snap) ? timerOf(snap, now) : null;
  // 04 › Khối Solo: at 200% "Bắt đầu" goes under the text, full width.
  const stacked = fontScale >= 1.5;
  const cycleLabel = cycle.long_break_min
    ? t('study.cycleLong', {
        cycle: cycleText(cycle),
        long: cycle.long_break_min,
      })
    : t('study.cycle', { cycle: cycleText(cycle) });

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
      onPress={() => onStart()}
    />
  );

  // Frame S-STUDY-01 › Solo: one row [title + cycle | button], filled surface-1.
  return (
    <View
      style={[
        styles.solo,
        stacked && styles.stacked,
        { borderColor: colors.border, backgroundColor: colors['surface-1'] },
      ]}
    >
      {timer ? (
        <View style={[styles.soloInfo, !stacked && styles.flex]}>
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
          style={[styles.soloInfo, !stacked && styles.flex]}
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
      {button}
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

const styles = StyleSheet.create({
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
