import type { SoloAction } from '@nezfocus/shared';
import { useNavigation } from '@react-navigation/native';
import {
  Pause,
  Play,
  SkipForward,
  Smartphone,
  Square,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import {
  FocusTimer,
  phaseRoomColor,
  RoomControl,
} from '../../../shared/ui/Focus';
import { Icon } from '../../../shared/ui/Icon';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { CycleSheet } from '../components/CycleSheet';
import { cycleText, durationText, hhmm } from '../format';
import {
  useCloseSolo,
  useNow,
  useSolo,
  useSoloAction,
  useStartSolo,
} from '../hooks/useSolo';

const mascots = {
  happy: require('../../../../assets/mascot/runtime-happy.webp'),
  sleepy: require('../../../../assets/mascot/runtime-sleepy.webp'),
  neutral: require('../../../../assets/mascot/runtime-neutral.webp'),
};

// S-STUDY-02 · Học một mình.
export function SoloScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();
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
    // Full-bleed phase background (DESIGN.md › Colors) runs under the status bar too.
    <View
      style={[styles.screen, { backgroundColor: background, paddingTop: top }]}
    >
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

  // DESIGN.md › Mascot: none in focus and none while waiting (sleeping contradicts "Học tiếp").
  const mascot =
    phase !== 'focus' && status !== 'waiting' ? (
      <Image
        source={phase === 'long_break' ? mascots.happy : mascots.sleepy}
        style={styles.ringMascot}
        accessibilityIgnoresInvertColors
      />
    ) : undefined;

  const c = s.cycle_config;
  const cycle = c.long_break_min
    ? t('study.cycleLong', { cycle: cycleText(c), long: c.long_break_min })
    : t('study.cycle', { cycle: cycleText(c) });

  return (
    <>
      <ScrollView contentContainerStyle={styles.body}>
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
        {status === 'waiting' && (
          <Button
            size="L"
            fullWidth
            label={t('study.continue')}
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
          <Image
            source={kind === 'expired' ? mascots.neutral : mascots.happy}
            style={styles.endMascot}
            accessibilityIgnoresInvertColors
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
        {/* ponytail: "Chuỗi {N} ngày liên tiếp" hidden until streaks exist, P1-B3.2 (#85). */}
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
  ended: { gap: space[2] },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingHorizontal: space[3],
    paddingBottom: space[4],
  },
  ringMascot: { width: size.mascotRing, height: size.mascotRing },
  endMascot: { width: size.mascotSummary, height: size.mascotSummary },
  total: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: size.iconGap },
  center: { textAlign: 'center' },
  endButtons: { alignSelf: 'stretch', gap: space[2] },
  footer: { padding: space[3] },
});
