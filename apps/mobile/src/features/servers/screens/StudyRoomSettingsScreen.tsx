import {
  DEFAULT_CYCLE_CONFIG,
  formatCycle,
  memberName,
  type CycleConfig,
  type FocusControl,
  type Locale,
} from '@nezfocus/shared';
import { Info } from 'lucide-react-native';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { serverRepository } from '../../../data/servers';
import { roomSessionOf } from '../../../data/study/roomSessions';
import {
  gatewayStore,
  onGatewayEvent,
} from '../../../domain/gateway/gatewayStore';
import { upsertChannel } from '../../../domain/servers/homeStore';
import {
  changedByOther,
  needsOffConfirm,
  saveStudyRoom,
  studyRoomView,
} from '../../../domain/servers/studyRoomSettings';
import { sessionStore } from '../../../domain/session/sessionStore';
import { space, useTheme } from '../../../shared/theme';
import { Skeleton, SystemBanner } from '../../../shared/ui/Feedback';
import { NoteLine } from '../../../shared/ui/NoteLine';
import { Dialog } from '../../../shared/ui/Overlay';
import { RadioRow } from '../../../shared/ui/RadioRow';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { CycleSheet } from '../../study/components/CycleSheet';
import { useChannelAccess } from '../hooks/useChannelAccess';
import { useMembers } from '../hooks/useMembers';

const CHOICES: FocusControl[] = ['everyone', 'managers', 'off'];

// S-SET-07 `loading`, `full-access`, `managers`, `off`, `switch-off-confirm`, `cycle-sheet`,
// `cycle-custom`, `cycle-invalid`, `save-error`, `offline`; Edge case `changed-by-other`,
// `large-text`, `long-cycle-360`. A radio saves at once; the cycle only with "Lưu".
export function StudyRoomSettingsScreen({
  serverId,
  channelId,
  onBack,
  onClose,
}: {
  serverId: string;
  channelId: string;
  onBack: () => void;
  onClose: () => void; // back to the drawer
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const myId = useStore(sessionStore, (s) => s.user?.id ?? null);
  const members = useMembers(serverId).data;
  const access = useChannelAccess(serverId, channelId, 'studyRoom', onClose);
  const channel = access?.channel;
  // The radio shows a choice while it saves; the old value comes back if it fails.
  const [pending, setPending] = useState<FocusControl | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [savingCycle, setSavingCycle] = useState(false);
  // What this screen last knew, to tell someone else's change from mine (changed-by-other).
  const known = useRef(channel);
  if (!known.current && channel) known.current = channel;

  const focus = pending ?? channel?.focus_control ?? 'off';
  const session = channel
    ? roomSessionOf({ focus_control: channel.focus_control }, myId)
    : null;

  const nameOf = (userId: string) => {
    const m = members?.find((x) => x.user.id === userId);
    return m ? memberName(m) : '';
  };
  const onEvent = useEffectEvent((by: string) =>
    showToast({
      message: t('servers.studyRoom.changedBy', { name: nameOf(by) }),
    }),
  );
  useEffect(
    () =>
      onGatewayEvent((e) => {
        if (e.t !== 'CHANNEL_UPDATE' || e.d.id !== channelId) return;
        const by = known.current && changedByOther(known.current, e.d, myId);
        known.current = e.d;
        if (by) onEvent(by);
      }),
    [channelId, myId],
  );

  // Edge case: the session ended while the dialog was open → it closes, Tắt applies.
  const [offQueued, setOffQueued] = useState(false);
  if (confirming && !session) {
    setConfirming(false);
    setOffQueued(true);
  }
  const applyOff = useEffectEvent(() => save({ focus_control: 'off' }, false));
  useEffect(() => {
    if (offQueued) void applyOff().finally(() => setOffQueued(false));
  }, [offQueued]);

  if (!access || !channel)
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <ScreenHeader title={t('servers.studyRoom.title')} onBack={onBack} />
        <View style={styles.body}>
          <Skeleton width={120} height={12} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={48} />
          ))}
          <Skeleton width={120} height={12} />
          <Skeleton width="100%" height={48} />
        </View>
      </View>
    );

  // `optimistic`: the radio shows the choice before the answer (a tap; not the Edge case).
  async function save(
    body: { focus_control?: FocusControl; default_cycle_config?: CycleConfig },
    optimistic = true,
  ): Promise<boolean> {
    if (optimistic && body.focus_control) setPending(body.focus_control);
    const result = await saveStudyRoom(serverRepository, channelId, body);
    setPending(null);
    if (result.ok) {
      known.current = result.channel;
      upsertChannel(result.channel);
      return true;
    }
    if (result.error === 'lost') access?.lostAccess();
    else
      showToast({
        message: t('servers.studyRoom.saveFailed'),
        action: {
          label: t('servers.studyRoom.retry'),
          onPress: () => void save(body),
        },
      });
    return false;
  }

  const choose = (next: FocusControl) => {
    if (next === focus) return;
    if (needsOffConfirm(focus, next, session)) return setConfirming(true);
    void save({ focus_control: next });
  };

  const saveCycle = async (cycle: CycleConfig) => {
    setSavingCycle(true);
    const ok = await save({ default_cycle_config: cycle });
    setSavingCycle(false);
    if (ok) setCycleOpen(false);
  };

  const view = studyRoomView({ focus_control: focus }, session, myId);
  const cycle = channel.default_cycle_config ?? DEFAULT_CYCLE_CONFIG;
  const people = session?.participants ?? 0;
  const note = view.note && t(`servers.studyRoom.${view.note}`);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('servers.studyRoom.title')} onBack={onBack} />
      {offline && <SystemBanner kind="offline" />}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: bottom }]}
      >
        {view.sessionPeople !== null && (
          <NoteLine
            icon={Info}
            text={t('servers.studyRoom.session', {
              count: view.sessionPeople,
            })}
          />
        )}
        <SectionLabel style={styles.section}>
          {t('servers.studyRoom.whoSection')}
        </SectionLabel>
        {CHOICES.map((choice) => (
          <RadioRow
            key={choice}
            label={t(`servers.studyRoom.${choice}`)}
            description={t(`servers.studyRoom.${choice}Hint`)}
            selected={focus === choice}
            disabled={offline}
            onPress={() => choose(choice)}
          />
        ))}
        {note && <NoteLine icon={Info} text={note} />}
        {view.showCycle && (
          <>
            <SectionLabel style={styles.section}>
              {t('servers.studyRoom.cycleSection')}
            </SectionLabel>
            <SettingsRow
              label={t('servers.studyRoom.cycle')}
              value={formatCycle(cycle, i18n.language as Locale)}
              wrapValue
              disabled={offline}
              onPress={() => setCycleOpen(true)}
            />
            <Text variant="label" color="text-secondary">
              {t('servers.studyRoom.cycleHint')}
            </Text>
          </>
        )}
      </ScrollView>
      <Dialog
        visible={confirming}
        title={
          people > 1
            ? t('servers.studyRoom.offTitle', { count: people })
            : t('servers.studyRoom.offTitleAlone')
        }
        body={t('servers.studyRoom.offBody')}
        cancel={{
          label: t('servers.studyRoom.cancel'),
          onPress: () => setConfirming(false),
        }}
        confirm={{
          label: t('servers.studyRoom.offConfirm'),
          variant: 'danger',
          onPress: () => {
            setConfirming(false);
            void save({ focus_control: 'off' });
          },
        }}
        onDismiss={() => setConfirming(false)}
      />
      {cycleOpen && (
        <CycleSheet
          visible
          mode="default"
          initial={cycle}
          loading={savingCycle}
          onSubmit={saveCycle}
          onDismiss={() => setCycleOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: space[3], gap: space[1] },
  section: { marginTop: space[3] },
});
