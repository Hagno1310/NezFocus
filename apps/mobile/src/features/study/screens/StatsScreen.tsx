import {
  addDays,
  averageMinutesPerDay,
  periodOf,
  type StatsView,
  type StudySessionRow,
  type StudyStatsResponse,
} from '@nezfocus/shared';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  canGoBack,
  canGoForward,
  comparison,
  isCurrentPeriod,
  isMilestone,
  monthLabel,
  monthRows,
  sessionLine,
  weekCells,
  weekRange,
  stepDate,
  weekdayOf,
  type DayCell,
} from '../../../domain/study/stats';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import { radius, size, space, useTheme } from '../../../shared/theme';
import { Button, IconButton } from '../../../shared/ui/Button';
import { EmptyState, Skeleton } from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { Mascot } from '../../../shared/ui/Mascot';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import {
  MonthCalendar,
  NumberText,
  SessionRow,
  StatText,
} from '../../../shared/ui/Stats';
import { Text } from '../../../shared/ui/Text';
import { Tooltip } from '../../../shared/ui/Tooltip';
import { Today } from '../components/Today';
import { WeekChart } from '../components/WeekChart';
import {
  allTimeText,
  minutesText,
  sessionSecondsText,
  weekdays,
  weekdaysLong,
} from '../format';
import { FIRST_FOCUS, useBeginSolo } from '../hooks/useBeginSolo';
import {
  useLiveFocusSeconds,
  useSessionHistory,
  useStudyStats,
} from '../hooks/useStudyStats';

type T = ReturnType<typeof useTranslation>['t'];

const NBSP = String.fromCharCode(0xa0);

// S-STUDY-03. Streak, today's progress and all-time are always the current numbers (from the
// current week), never those of the period being viewed.
export function StatsScreen({
  initialDate,
  onBack,
  onOpenSolo,
  onAskNotifications,
}: {
  initialDate?: string;
  onBack: () => void;
  onOpenSolo: () => void;
  onAskNotifications: () => void;
}) {
  const { t } = useTranslation();
  const online = useOnline();
  const [view, setView] = useState<StatsView>('week');
  // Pinned once known: past midnight the screen keeps the period being viewed.
  const [date, setDate] = useState(initialDate);
  const current = useStudyStats('week').data;
  if (!date && current) setDate(current.today);
  const period = useStudyStats(view, date);
  const history = useSessionHistory(view, date);
  const { begin } = useBeginSolo({ onOpenSolo, onAskNotifications });

  // A period never loaded while offline shows the previous one as placeholder: not this period.
  const p = period.isPlaceholderData && !online ? undefined : period.data;
  const today = current?.today ?? p?.today;
  const shown = date ? periodOf(view, date) : null;
  const never = current && !current.first_date;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearEnd =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
    if (nearEnd && history.hasNextPage && !history.isFetchingNextPage)
      void history.fetchNextPage();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('study.stats.title')} onBack={onBack} />
      <ConnectionBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={200}
      >
        <SegmentedControl
          segments={[
            { key: 'week', label: t('study.stats.week') },
            { key: 'month', label: t('study.stats.month') },
          ]}
          value={view}
          onChange={setView}
        />
        {shown && today && (
          <PeriodPicker
            label={
              view === 'week'
                ? weekRange(shown.from, shown.to, today)
                : t('study.stats.monthLabel', { month: monthLabel(shown.from) })
            }
            back={
              !never &&
              !!current &&
              canGoBack({ first_date: current.first_date, from: shown.from })
            }
            forward={!never && canGoForward({ to: shown.to, today })}
            onStep={(dir) => setDate(stepDate(view, date!, dir, today))}
          />
        )}
        {never ? (
          <EmptyState
            mascot
            title={t('study.home.neverTitle')}
            action={{
              label: t('study.home.neverStart'),
              variant: 'secondary',
              onPress: () => void begin(FIRST_FOCUS, false),
            }}
          />
        ) : (
          <>
            {current && <Current stats={current} />}
            {p && p.from === shown?.from ? (
              <>
                <PeriodNumbers stats={p} t={t} />
                {view === 'week' && <FourWeeks to={p.from} today={p.today} />}
              </>
            ) : !online ? (
              <EmptyState title={t('study.stats.offline')} />
            ) : (
              <Skeleton width="100%" height={160} />
            )}
            {current && (
              <NumberText
                variant="body"
                color="text-primary"
                text={t('study.stats.allTime', {
                  d: allTimeText(t, current.all_time_minutes),
                })}
              />
            )}
            {(p || online) && (
              <History
                history={history}
                stats={p}
                view={view}
                online={online}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function PeriodPicker({
  label,
  back,
  forward,
  onStep,
}: {
  label: string;
  back: boolean;
  forward: boolean;
  onStep: (dir: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const [tip, setTip] = useState(false);
  return (
    <View style={styles.picker}>
      {/* Long press on the disabled "‹" says why (S-STUDY-03 › Thể hiện kỳ). */}
      {/* No `disabled` here: on Android it setEnabled(false)s the wrapper (apps/mobile/AGENTS.md). */}
      <Pressable
        onLongPress={back ? undefined : () => setTip(true)}
        onPressOut={() => setTip(false)}
      >
        <IconButton
          icon={ChevronLeft}
          label={t('study.stats.prev')}
          disabled={!back}
          onPress={() => onStep(-1)}
        />
        {tip && <Tooltip text={t('study.stats.noEarlier')} />}
      </Pressable>
      <Text variant="headline" style={styles.pickerLabel}>
        {label}
      </Text>
      <IconButton
        icon={ChevronRight}
        label={t('study.stats.next')}
        disabled={!forward}
        onPress={() => onStep(1)}
      />
    </View>
  );
}

function Current({ stats }: { stats: StudyStatsResponse }) {
  const { t } = useTranslation();
  const streak = stats.current_streak_days;
  const longest = t('study.stats.longest', { days: stats.longest_streak_days });
  return (
    <View style={styles.group}>
      {isMilestone(streak) && (
        <View style={styles.milestone}>
          <Mascot mood="happy" size={size.mascotSummary} />
          <NumberText
            variant="headline"
            color="text-primary"
            text={t('study.stats.milestone', { days: streak })}
          />
        </View>
      )}
      <View style={styles.streak}>
        <Icon as={Flame} size="xl" color="text-secondary" />
        <StatText text={`${streak} ${t('study.streakUnit')}`} />
      </View>
      {streak ? (
        <NumberText text={longest} />
      ) : (
        // STUDY-03 AC2: neutral, no mascot; "14 ngày" stays on one line.
        <NumberText
          text={`${t('study.streakZero')} · ${longest.replace(/ (?=\S+$)/, NBSP)}`}
        />
      )}
      <Today minutes={stats.today_minutes} />
    </View>
  );
}

function PeriodNumbers({ stats, t }: { stats: StudyStatsResponse; t: T }) {
  const [tip, setTip] = useState(false);
  const c = comparison(stats);
  const running = isCurrentPeriod(stats);
  const v = stats.view;
  const title =
    v === 'month'
      ? t('study.stats.monthTitle', { month: monthLabel(stats.from) })
      : running
        ? t('study.stats.thisWeek')
        : t('study.stats.weekTitle', {
            range: weekRange(stats.from, stats.to, stats.today),
          });
  const compare =
    c.kind === 'diff'
      ? t(`study.stats.diff.${v}`, {
          sign: c.minutes > 0 ? '+' : '−',
          d: minutesText(t, Math.abs(c.minutes)),
        })
      : c.kind === 'none-before'
        ? t(`study.stats.none.${v}`)
        : c.kind === 'equal'
          ? t(`study.stats.equal.${v}`)
          : null;
  const avg = averageMinutesPerDay(stats.total_minutes, stats);
  return (
    <View style={styles.group}>
      <Text variant="label" color="text-secondary">
        {title}
      </Text>
      <StatText text={minutesText(t, stats.total_minutes)} />
      {compare && (
        <Pressable
          disabled={!running}
          onLongPress={() => setTip(true)}
          onPressOut={() => setTip(false)}
        >
          <NumberText text={compare} />
          {tip && <Tooltip text={t('study.stats.partial')} />}
        </Pressable>
      )}
      <NumberText text={t('study.stats.average', { d: minutesText(t, avg) })} />
      {v === 'week' ? (
        <WeekChart days={stats.days} today={stats.today} />
      ) : (
        <MonthCalendar
          title={t('study.stats.calendarTitle', {
            month: monthLabel(stats.from),
            total: minutesText(t, stats.total_minutes),
          })}
          weekdays={weekdays(t)}
          rows={monthRows(stats.days, stats.today).map((row) =>
            row.map((c) => c && { ...c, a11y: dayA11y(t, c) }),
          )}
        />
      )}
      {/* empty-week: no split line when nothing was studied. */}
      {stats.total_minutes > 0 && (
        <NumberText
          text={t('study.stats.split', {
            room: minutesText(t, stats.room_minutes),
            solo: minutesText(t, stats.solo_minutes),
          })}
        />
      )}
    </View>
  );
}

function dayA11y(t: T, c: DayCell) {
  const day = t('study.stats.dayA11y', {
    weekday: weekdaysLong(t)[weekdayOf(c.date)],
    day: c.day,
    month: Number(c.date.slice(5, 7)),
  });
  if (c.state === 'future') return `${day}, ${t('study.stats.futureA11y')}`;
  const minutes = minutesText(t, c.minutes);
  return c.state === 'reached'
    ? `${day}, ${minutes}, ${t('study.stats.reachedA11y')}`
    : `${day}, ${minutes}`;
}

// Week view only: four weeks ending with the one being viewed, a cell per day.
function FourWeeks({ to, today }: { to: string; today: string }) {
  const weeks = [
    useStudyStats('week', addDays(to, -21)).data,
    useStudyStats('week', addDays(to, -14)).data,
    useStudyStats('week', addDays(to, -7)).data,
  ];
  const last = useStudyStats('week', to).data;
  const { colors } = useTheme();
  const { t } = useTranslation();
  // Weeks not loaded yet (or offline) are left out rather than hiding the grid.
  const loaded = [...weeks, last].filter((w) => !!w);
  if (!loaded.length) return null;
  return (
    <View style={styles.grid}>
      {loaded.map((w) => (
        <View key={w.from} style={styles.gridRow}>
          {weekCells(w.days, today).map((c) => (
            <View
              key={c.date}
              accessible
              accessibilityLabel={dayA11y(t, c)}
              style={[
                styles.gridCell,
                c.state === 'reached' && { backgroundColor: colors.primary },
                c.state === 'below' && {
                  borderWidth: size.hairline,
                  borderColor: colors['border-input'],
                },
                c.today && {
                  borderWidth: size.strokeThick,
                  borderColor: colors['text-primary'],
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function rowTitle(t: T, row: StudySessionRow) {
  if (row.kind === 'solo' || !row.room) return t('study.solo');
  const { access, channel_name, server_name } = row.room;
  if (access === 'visible') return `${channel_name} · ${server_name}`;
  if (access === 'gone') return t('study.stats.gone');
  return t(`study.stats.${access}`, { server: server_name });
}

function History({
  history,
  stats,
  view,
  online,
}: {
  history: ReturnType<typeof useSessionHistory>;
  stats: StudyStatsResponse | undefined;
  view: StatsView;
  online: boolean;
}) {
  const { t } = useTranslation();
  const live = useLiveFocusSeconds();
  const names = weekdays(t);
  const rows = history.data?.pages.flatMap((p) => p.study_sessions) ?? [];
  let body: ReactNode;
  if (history.isError && !rows.length)
    body = (
      <View style={styles.historyError}>
        <Text color="text-secondary">{t('study.stats.historyError')}</Text>
        <Button
          variant="text"
          size="S"
          label={t('study.stats.retry')}
          onPress={() => void history.refetch()}
        />
      </View>
    );
  // A period whose numbers are cached but whose history never loaded: not "no sessions".
  else if (history.isPending && !online)
    body = <Text color="text-secondary">{t('study.stats.offline')}</Text>;
  else if (!stats || history.isPending) body = <SkeletonRows />;
  else if (!rows.length)
    body = <Text color="text-secondary">{t('study.stats.historyEmpty')}</Text>;
  else
    body = (
      <>
        {rows.map((row) => {
          const l = sessionLine(row, stats.timezone, stats.today, stats.to);
          const running = !row.ended_at;
          const seconds =
            row.focused_seconds + (running && row.kind === 'solo' ? live : 0);
          const line = [
            `${names[l.weekday]} ${l.date}`,
            `${l.start} – ${l.end ?? t('study.stats.now')}${
              l.endWeekday === null ? '' : ` (${names[l.endWeekday]})`
            }`,
            l.joins > 1 && t('study.stats.joins', { count: l.joins }),
            l.laterMinutes > 0 &&
              t(`study.stats.later.${view}`, {
                d: minutesText(t, l.laterMinutes),
              }),
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <SessionRow
              key={row.id}
              kind={row.kind}
              title={rowTitle(t, row)}
              line={line}
              minutes={sessionSecondsText(t, seconds)}
              running={running ? t('study.stats.running') : undefined}
            />
          );
        })}
        {history.isFetchingNextPage && <SkeletonRows />}
        {history.isFetchNextPageError && (
          <View style={styles.historyError}>
            <Text color="text-secondary">{t('study.stats.historyError')}</Text>
            <Button
              variant="text"
              size="S"
              label={t('study.stats.retry')}
              onPress={() => void history.fetchNextPage()}
            />
          </View>
        )}
      </>
    );
  return (
    <View style={styles.group}>
      <Text variant="label" color="text-secondary">
        {t('study.stats.history')}
      </Text>
      {body}
    </View>
  );
}

const SkeletonRows = () => (
  <View style={styles.group}>
    <Skeleton width="100%" height={size.settingsRow} />
    <Skeleton width="100%" height={size.settingsRow} />
  </View>
);

const CELL = 20;
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[3], gap: space[4] },
  picker: { flexDirection: 'row', alignItems: 'center' },
  pickerLabel: { flex: 1, textAlign: 'center' },
  group: { gap: space[2] },
  milestone: { alignItems: 'center', gap: space[2] },
  streak: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  grid: { gap: space[1] },
  gridRow: { flexDirection: 'row', gap: space[1] },
  gridCell: { width: CELL, height: CELL, borderRadius: radius.badge },
  historyError: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
