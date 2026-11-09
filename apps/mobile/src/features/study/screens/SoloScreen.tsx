import type { SoloAction } from '@nezfocus/shared';
import { useNavigation } from '@react-navigation/native';
import {
  BellOff,
  Pause,
  Play,
  SkipForward,
  Smartphone,
  Square,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import {
  endingOf,
  timerOf,
  type SoloEnding,
  type SoloSnapshot,
  type SoloTimer,
} from '../../../domain/study/solo';
import { size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Banner } from '../../../shared/ui/Feedback';
import {
  FocusTimer,
  phaseRoomColor,
  RoomControl,
} from '../../../shared/ui/Focus';
import { Icon } from '../../../shared/ui/Icon';
import { Mascot } from '../../../shared/ui/Mascot';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { CycleSheet } from '../components/CycleSheet';
import {
  openExactAlarmSettings,
  useNotificationAccess,
} from '../hooks/useSoloAlerts';
import { cycleText, durationText, hhmm } from '../format';
import {
  useCloseSolo,
  useNow,
  useSolo,
  useSoloAction,
  useStartSolo,
} from '../hooks/useSolo';

// S-STUDY-02 · Học một mình.
export function SoloScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const snap = useSolo();
  const now = useNow();
  const close = useCloseSolo();
  const start = useStartSolo();
  const timer = snap && timerOf(snap, now);
  const ending = snap && endingOf(snap);

  // Nothing to show (closed, or gone on restore): back to the tab.
  useEffect(() => {
    if (!snap && navigation.canGoBack()) navigation.goBack();
  }, [snap, navigation]);

  const background = timer ? colors[phaseRoomColor[timer.phase]] : colors.bg;
  return (
    // Full-bleed phase background (DESIGN.md › Colors) runs under the status bar too; the
    // transparent header takes the inset.
    <View style={[styles.screen, { backgroundColor: background }]}>
      <ScreenHeader
        title={t('study.solo')}
        onBack={() => navigation.goBack()}
        transparent
      />
      <ConnectionBanner />
      {snap && timer && <Running snap={snap} timer={timer} />}
      {snap && ending && (
        <Ended
          ending={ending}
          busy={start.isPending}
          onDone={close}
          onAgain={() => start.mutate(snap.session.cycle_config)}
        />
      )}
    </View>
  );
}

function Running({ snap, timer }: { snap: SoloSnapshot; timer: SoloTimer }) {
  const { t } = useTranslation();
  const access = useNotificationAccess();
  // S-STUDY-EDGE notif-denied replaces exact-alarm-off: a late alarm means nothing with no notifications.
  const denied = access?.access === 'denied';
  const exactOff = access?.access === 'granted' && !access.exactAlarm;
  const online = useStore(gatewayStore, (s) => s.online);
  const action = useSoloAction();
  const [editing, setEditing] = useState(false);
  const s = snap.session;
  const act = (a: SoloAction) => action.mutate({ id: s.id, action: a });

  const { status, phase } = timer;
  const label =
    status === 'running'
      ? t(`study.phase.${phase}`)
      : t(`study.phase.${status}`);
  const lines = [
    status === 'paused'
      ? t('study.line.paused')
      : status === 'waiting'
        ? t('study.line.waiting')
        : phase === 'focus'
          ? t('study.line.round', {
              round: timer.round,
              next: t(`study.next.${timer.next!.phase as 'break'}`),
              time: hhmm(timer.next!.at),
            })
          : t('study.line.breakEnds', { time: hhmm(timer.next!.at) }),
    timer.pending &&
      t('study.line.pending', { cycle: cycleText(timer.pending) }),
    // Spec 04 offline: the banner already says "offline", the line only says what follows.
    !online && t('study.line.offline'),
  ].filter((l): l is string => !!l);

  // DESIGN.md › Mascot: only while a break runs; none in focus, paused, or waiting (sleeping contradicts "Học tiếp").
  const mascot =
    phase !== 'focus' && status === 'running' ? (
      <Mascot
        mood={phase === 'long_break' ? 'happy' : 'sleepy'}
        size={size.mascotRing}
      />
    ) : undefined;

  const c = s.cycle_config;
  const cycle = c.long_break_min
    ? t('study.cycleLong', { cycle: cycleText(c), long: c.long_break_min })
    : t('study.cycle', { cycle: cycleText(c) });

  return (
    <>
      {denied && (
        <Banner
          icon={BellOff}
          text={t('study.alerts.denied')}
          action={{
            label: t('study.alerts.enable'),
            onPress: () => void Linking.openSettings(),
          }}
        />
      )}
      <ScrollView contentContainerStyle={[styles.body, styles.hero]}>
        <FocusTimer
          phase={phase}
          state={status}
          leftMs={timer.remainingMs}
          totalMs={timer.totalMs}
          label={label}
          lines={lines}
          long={timer.long}
          mascot={mascot}
          // C-06: read once a minute, not every second.
          accessibilityLabel={t('study.a11yTimer', {
            phase: label,
            round: timer.round,
            minutes: Math.ceil(timer.remainingMs / 60_000),
          })}
        />
        {exactOff && (
          <View style={styles.exact}>
            <Text variant="label" color="text-secondary">
              {t('study.alerts.exactAlarmOff')}
            </Text>
            <Button
              variant="text"
              size="S"
              label={t('study.alerts.exactAlarmAllow')}
              onPress={openExactAlarmSettings}
            />
          </View>
        )}
        {status === 'waiting' && (
          <Button
            size="L"
            label={t('study.continue')}
            style={styles.continue}
            onPress={() => act({ action: 'continue' })}
          />
        )}
        {/* ponytail: "{N} bạn đang học lúc này" stays hidden (spec: hidden when nobody) until friends' presence, P2-B2 (#19). */}
        <Button
          variant="text"
          label={`${cycle} · ${t('study.edit')}`}
          onPress={() => setEditing(true)}
        />
      </ScrollView>
      <View style={styles.controls}>
        {status !== 'waiting' && (
          <RoomControl
            icon={SkipForward}
            label={t('study.skip')}
            onPress={() => act({ action: 'skip' })}
          />
        )}
        {status !== 'waiting' && (
          <RoomControl
            main
            icon={status === 'paused' ? Play : Pause}
            label={t(status === 'paused' ? 'study.resume' : 'study.pause')}
            onPress={() =>
              act({ action: status === 'paused' ? 'resume' : 'pause' })
            }
          />
        )}
        {/* STUDY-10 AC6: stop without asking. */}
        <RoomControl
          icon={Square}
          label={t('study.stop')}
          onPress={() => act({ action: 'stop' })}
        />
      </View>
      <CycleSheet
        key={String(editing)}
        visible={editing}
        mode="edit"
        initial={s.next_cycle_config ?? c}
        onDismiss={() => setEditing(false)}
        onSubmit={(cycle_config) => {
          act({ action: 'config', cycle_config });
          setEditing(false);
        }}
      />
    </>
  );
}

function Ended({
  ending,
  busy,
  onDone,
  onAgain,
}: {
  ending: SoloEnding;
  busy: boolean;
  onDone: () => void;
  onAgain: () => void;
}) {
  const { t } = useTranslation();
  const { kind, minutes } = ending;
  const tooShort = kind === 'too-short';
  const hours = Math.floor(minutes / 60);
  const title =
    kind === 'expired'
      ? t('study.ended.expired')
      : tooShort
        ? t('study.ended.tooShort')
        : t('study.ended.summary');
  const notes = [
    tooShort && t('study.ended.tooShortNote'),
    ending.days &&
      t('study.ended.days', {
        yesterday: durationText(t, ending.days.yesterday),
        today: durationText(t, ending.days.today),
      }),
    ending.hitCap && t('study.ended.cap'),
    kind === 'expired' &&
      t('study.ended.expiredNote', { time: hhmm(ending.endedAt) }),
  ].filter((n): n is string => !!n);

  const buttons = (
    <View style={styles.endButtons}>
      <Button
        size="L"
        fullWidth
        label={t('study.ended.done')}
        onPress={onDone}
      />
      <Button
        size="L"
        fullWidth
        variant="secondary"
        loading={busy}
        label={t(tooShort ? 'study.ended.again' : 'study.ended.more')}
        onPress={onAgain}
      />
    </View>
  );

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.body, styles.ended]}
        accessibilityLiveRegion="polite"
      >
        {/* Spec 04: happy on a summary, neutral when it ran out, none when nothing counted. */}
        {!tooShort && (
          <Mascot
            mood={kind === 'expired' ? 'neutral' : 'happy'}
            size={size.mascotSummary}
          />
        )}
        <Text variant="title-2" style={styles.center}>
          {title}
        </Text>
        {!tooShort && (
          <View style={styles.total}>
            {hours > 0 && <Text variant="stat">{hours}</Text>}
            {hours > 0 && <Text variant="body">{t('study.hours')}</Text>}
            <Text variant="stat">{minutes % 60}</Text>
            <Text variant="body">{t('study.minutes')}</Text>
          </View>
        )}
        {notes.map((n) => (
          <Text
            key={n}
            variant="body-sm"
            color="text-secondary"
            style={styles.center}
          >
            {n}
          </Text>
        ))}
        {/* ponytail: "Chuỗi {N} ngày liên tiếp" hidden until the app reads the streak (STREAK_UPDATE / study-stats), P1-B3.4 (#87). */}
        {kind === 'stopped-other-device' && (
          <View style={styles.row}>
            <Icon as={Smartphone} size="sm" color="text-secondary" />
            <Text variant="body-sm" color="text-secondary">
              {t('study.ended.otherDevice', { time: hhmm(ending.endedAt) })}
            </Text>
          </View>
        )}
        {/* S-STUDY-EDGE too-short: text and buttons stay together mid-screen. */}
        {tooShort && buttons}
      </ScrollView>
      {!tooShort && <View style={styles.footer}>{buttons}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  body: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    padding: space[3],
  },
  // Board S-STUDY-02 waiting: "Học tiếp" 240 × 48 under the ring, hero gap 12.
  continue: { width: 240 },
  exact: { alignItems: 'center' },
  // Board: the hero sits 16 under the header, not centred; controls stay at the bottom.
  hero: { gap: space[2] + space[1], justifyContent: 'flex-start' },
  ended: { gap: space[2] },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingHorizontal: space[3],
    paddingBottom: space[4],
  },
  total: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: size.iconGap },
  center: { textAlign: 'center' },
  endButtons: { alignSelf: 'stretch', gap: space[2] },
  footer: { padding: space[3] },
});
