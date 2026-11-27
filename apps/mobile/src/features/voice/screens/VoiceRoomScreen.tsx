import {
  CYCLE_PRESETS,
  Permission,
  hasPermission,
  type CycleConfig,
} from '@nezfocus/shared';
import {
  LampDesk,
  Lock,
  LogOut,
  Mic,
  MicOff,
  Pause,
  Play,
  SlidersHorizontal,
  Video,
  VideoOff,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { voiceSession } from '../../../data/voice';
import { micPermission } from '../../../data/voice/micPermission';
import {
  CameraPreview,
  ParticipantVideo,
} from '../../../data/voice/VoiceVideo';
import type {
  JoinResult,
  VoiceTarget,
} from '../../../domain/voice/voiceSession';
import { voiceNotice } from '../../../domain/voice/voiceNotice';
import {
  clearVoiceIntent,
  closeVoice,
  openVoice,
  voiceView,
} from '../../../domain/voice/voiceView';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { sessionStore } from '../../../domain/session/sessionStore';
import { motion, radius, size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { ChannelHeader } from '../../../shared/ui/Chat';
import { SystemBanner } from '../../../shared/ui/Feedback';
import {
  RoomControl,
  phaseRoomColor,
  type RoomControlState,
} from '../../../shared/ui/Focus';
import { Dialog } from '../../../shared/ui/Overlay';
import {
  ParticipantTile,
  VideoGrid,
  gridTileWidth,
} from '../../../shared/ui/Room';
import { Text } from '../../../shared/ui/Text';
import { showToast, useToastTop } from '../../../shared/ui/Toast';
import { channelIcon } from '../../servers/components/ChannelRow';
import { CycleSheet } from '../../study/components/CycleSheet';
import { RoomSessionBody } from '../../study/components/RoomSessionBody';
import { useNow } from '../../study/hooks/useSolo';
import {
  useRoomAction,
  useRoomSessionOf,
  useStartRoomSession,
} from '../../study/hooks/useRoomSession';
import { RoomControlSheet } from '../../study/components/RoomControlSheet';
import { RoomSummarySheet } from '../../study/components/RoomSummarySheet';
import {
  nextPhaseOf,
  roomControls,
  successorOf,
} from '../../../domain/study/roomView';
import {
  dropSummary,
  expectSoloEnd,
  roomSessionsStore,
} from '../../../domain/study/roomSessions';
import { soloSecondsNow } from '../../../domain/study/solo';
import { useSolo } from '../../study/hooks/useSolo';
import { leaveRoom } from '../leaveRoom';
import { homeStore } from '../../../domain/servers/homeStore';
import { seatsIn } from '../../../domain/voice/voiceRooms';
import { voiceStore } from '../../../domain/voice/voiceSession';
import { roomTimer } from '@nezfocus/shared';
import { CameraPreviewSheet } from '../components/CameraPreviewSheet';
import { MediaSheet } from '../components/MediaSheet';
import { useMediaFlow } from '../hooks/useMediaFlow';
import { useVoiceRoom } from '../hooks/useVoiceRoom';

const BODY_X = space[3];

// S-ROOM-01: the preview (`not-joined`, `offline`, `no-connect`) and the room before a session
// (`study-room-idle`, `not-study-room`, `managers-only`, `voice-video-grid`); S-ROOM-02 once the
// room has a Room Session (CR-28 #38), its preview included.
export function VoiceRoomScreen({
  serverId,
  channelId,
  onOpenLeft,
}: VoiceTarget & { onOpenLeft: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const { session, summary, offsetMs } = useRoomSessionOf(channelId);
  const room = useVoiceRoom(
    serverId,
    channelId,
    session ? session.host_id : undefined,
  );
  const meId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const myCallChannel = useStore(voiceStore, (s) => s.call?.channelId ?? null);
  const syncing = useStore(gatewayStore, (s) => s.banner !== null);
  const now = useNow().getTime();
  const [starting, setStarting] = useState(false);
  const [controlling, setControlling] = useState(false);
  const [editing, setEditing] = useState(false);
  // S-ROOM-05: `stop`, or leaving / switching as the Host of the running session; S-ROOM-06 and
  // S-ROOM-03 `solo-confirm` while a Solo runs (CR-22).
  const [confirm, setConfirm] = useState<
    | null
    | { kind: 'stop' }
    | { kind: 'leave' | 'switch'; successor: string | null }
    | { kind: 'solo-join' }
    | { kind: 'solo-start'; cycle: CycleConfig }
  >(null);
  const solo = useSolo();
  const soloRunning = !!solo && solo.session.status !== 'ended';
  const intent = useStore(voiceView, (s) =>
    s.open?.channelId === channelId ? s.intent : null,
  );

  const act = useRoomAction();
  const hasSessionElsewhere = useStore(
    roomSessionsStore,
    (s) =>
      !!myCallChannel &&
      myCallChannel !== channelId &&
      !!s.byChannel[myCallChannel],
  );
  // My own Host seat elsewhere: switching rooms asks first (VC-01 AC3, `host-switch`).
  const myCall = useStore(voiceStore, (s) => s.call);
  const hostedElsewhere = useStore(roomSessionsStore, (s) => {
    const f =
      myCall && myCall.channelId !== channelId
        ? s.byChannel[myCall.channelId]
        : undefined;
    return f && f.host_id === meId ? f : null;
  });
  const [toastTop, setToastTop] = useState<number | null>(null);
  // Solo minutes when "Bắt đầu" was confirmed over a running Solo (`solo-confirm`).
  const soloAtStart = useRef<number | null>(null);
  const start = useStartRoomSession(channelId, (f) => {
    setStarting(false);
    // Spec 03 › Chỉ ghi luật: started by someone else while my Solo ran → the Solo's sentence.
    if (soloAtStart.current !== null) {
      showToast({
        icon: LampDesk,
        message: t('room.soloStopped', { minutes: soloAtStart.current }),
      });
      soloAtStart.current = null;
      return;
    }
    // S-ROOM-03 `conflict`: the sheet closes onto the new session.
    if (f?.host_id)
      showToast({
        message: t('room.conflict', { name: room.nameOf(f.host_id) }),
      });
  });
  const media = useMediaFlow();
  // Preview Mic / Camera (CR-22 #4): joins with them as chosen here.
  const [previewMic, setPreviewMic] = useState(false);
  const [previewCamera, setPreviewCamera] = useState(false);
  // `camera-self-preview`: the first Camera in a room this login, unless seen in the preview.
  const [selfPreview, setSelfPreview] = useState(false);
  const [joining, setJoining] = useState(false);
  // Spec 03 › Toast: under the header, and under the role chip in a session.
  useToastTop(top + size.header + (toastTop ?? 0));
  const clock = session ? roomTimer(session, offsetMs, now) : null;
  const background = useRoomBackground(
    clock?.phase ?? null,
    // 7.3.6 step 4: a phase slept through (app reopened) is shown at once.
    !!clock &&
      clock.status === 'running' &&
      clock.totalMs - clock.remainingMs < LIVE_PHASE_MS,
  );
  // Which room screen is on show, for the `ended-elsewhere` Toast.
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    voiceView.setState({ visible: channelId });
    return () => voiceView.setState({ visible: null });
  }, [focused, channelId]);
  const otherDevice = useStore(
    voiceNotice,
    (s) => s.otherDevice?.channelId === channelId,
  );

  if (session && starting) setStarting(false);

  const { channel, layout, here, joined } = room;
  if (!channel || !layout) return null;
  const target = { serverId, channelId };
  const canManage = hasPermission(room.perms, Permission.MANAGE_STUDY_ROOMS);
  const defaultCycle: CycleConfig =
    channel.default_cycle_config ?? CYCLE_PRESETS['25/5'];

  const tell = (result: JoinResult, retry: () => void) => {
    // S-STUDY-EDGE `lost-access`: no longer allowed in.
    if (result === 'no-connect')
      showToast({
        icon: Lock,
        message: t('study.home.lostAccess', { name: channel.name }),
      });
    else if (result === 'gone') {
      closeVoice();
      showToast({ message: t('voice.gone', { name: channel.name }) });
    } else if (result === 'failed')
      showToast({
        message: t('voice.joinFailed'),
        action: { label: t('voice.retry'), onPress: retry },
      });
  };
  const join = async (asked = false) => {
    if (joined) return;
    // S-ROOM-06: only for a room with a session; else the Solo runs on (`voice-solo`).
    if (!asked && session && soloRunning) {
      setConfirm({ kind: 'solo-join' });
      return;
    }
    if (!asked && hostedElsewhere && myCall) {
      // ponytail: the other room's seats are known, its members only when its server is open;
      // khi switching across servers matters: load that server's members for the managers rule.
      const seats = seatsIn(voiceStore.getState().seats, myCall.channelId);
      const other = homeStore
        .getState()
        .channels[myCall.serverId]?.find((c) => c.id === myCall.channelId);
      setConfirm({
        kind: 'switch',
        successor:
          other?.focus_control === 'managers'
            ? successorOf(seats, meId, 'managers', (id) =>
                hasPermission(room.permsOf(id), Permission.MANAGE_STUDY_ROOMS),
              )
            : successorOf(seats, meId, 'everyone', () => true),
      });
      return;
    }
    setJoining(true);
    const result = await voiceSession.join(target, {
      mic: previewMic,
      camera: previewCamera,
    });
    setJoining(false);
    if (result === 'joined') {
      setPreviewMic(false);
      setPreviewCamera(false);
    } else tell(result, () => void join());
  };
  // "Vào lại" (left-voice-toast) and "Vào lại ở đây" (other-device): the same room, mic off.
  const rejoin = async () => {
    openVoice(target);
    tell(await voiceSession.join(target), () => void rejoin());
  };

  const leaveNow = () => leaveRoom(target, channel.name);
  const successorHere = () =>
    successorOf(room.seats, meId, channel.focus_control, (id) =>
      hasPermission(room.permsOf(id), Permission.MANAGE_STUDY_ROOMS),
    );
  // A Participant leaves without a question; the Host of the running session confirms who takes
  // over (`host-leave` / `no-successor`).
  const leave = () => {
    if (!joined) return;
    if (session && session.host_id === meId)
      setConfirm({ kind: 'leave', successor: successorHere() });
    else leaveNow();
  };
  const soloMinutes = () =>
    solo ? Math.floor(soloSecondsNow(solo, new Date(now)) / 60) : 0;
  const begin = (cycle_config: CycleConfig, end_solo?: boolean) => {
    soloAtStart.current = end_solo ? soloMinutes() : null;
    if (end_solo) expectSoloEnd();
    start.mutate(
      { cycle_config, ...(end_solo && { end_solo }) },
      { onSuccess: () => setStarting(false) },
    );
  };

  // S-ROOM-06: "Bạn đã học {17} phút — … Phòng đang Tập trung, còn {18} phút."
  const soloJoinBody = () => {
    const timer = session && roomTimer(session, offsetMs, now);
    const left = timer ? Math.floor(timer.remainingMs / 60_000) : 0;
    const phase = timer
      ? timer.status === 'paused'
        ? t('study.phase.pausedShort')
        : t(`study.phase.${timer.phase}`)
      : '';
    return t(left ? 'room.soloJoin.body' : 'room.soloJoin.bodyUnder', {
      minutes: soloMinutes(),
      phase,
      left,
    });
  };

  const micOn = joined ? !!here?.mic : previewMic;
  const pressMic = async () => {
    if (micOn) {
      if (joined) void voiceSession.setMic(false);
      else setPreviewMic(false);
      return;
    }
    if (!(await media.ensure('mic'))) return;
    if (joined) void voiceSession.setMic(true);
    else setPreviewMic(true);
  };

  const cameraOn = joined ? !!here?.camera : previewCamera;
  const pressCamera = async () => {
    if (cameraOn) {
      if (joined) void voiceSession.setCamera(false);
      else setPreviewCamera(false);
      return;
    }
    if (!(await media.ensure('camera'))) return;
    if (!joined) setPreviewCamera(true);
    // VC-01 AC7: seen once this login → straight on; else `camera-self-preview` first.
    else if (room.cameraPreviewed) void voiceSession.setCamera(true);
    else setSelfPreview(true);
  };

  const state = (denied: boolean, on: boolean): RoomControlState =>
    denied ? 'no-permission' : on ? 'on' : 'off';
  const toggles = (
    <>
      {layout.mic && (
        <RoomControl
          icon={micOn ? Mic : MicOff}
          // C-17 `mod-muted` (REQ-VC-04): disabled until a moderator turns it back on.
          label={t(here?.modMuted ? 'voice.modMuted' : 'voice.mic')}
          state={here?.modMuted ? 'mod-muted' : state(room.denied.mic, micOn)}
          narrow={!joined}
          onPress={() => void pressMic()}
        />
      )}
      {layout.camera && (
        <RoomControl
          icon={cameraOn ? Video : VideoOff}
          label={t('voice.camera')}
          state={state(room.denied.camera, cameraOn)}
          narrow={!joined}
          onPress={() => void pressCamera()}
        />
      )}
    </>
  );

  // S-ROOM-02 › Hàng nút: Host / MANAGE_STUDY_ROOMS get Tạm dừng · Điều khiển; a Participant of a
  // paused session without Host gets Tiếp tục.
  const sessionButtons = () => {
    if (!session) return null;
    const role = roomControls({ session, meId, canManage });
    const paused = session.status === 'paused';
    if (role === 'participant') return null;
    const main = (
      <RoomControl
        main
        icon={paused ? Play : Pause}
        label={t(paused ? 'study.resume' : 'study.pause')}
        onPress={() =>
          act.mutate({
            id: session.id,
            action: { action: paused ? 'resume' : 'pause' },
          })
        }
      />
    );
    return role === 'resume' ? (
      main
    ) : (
      <>
        {main}
        <RoomControl
          icon={SlidersHorizontal}
          label={t('room.control')}
          onPress={() => setControlling(true)}
        />
      </>
    );
  };

  const tileWidth = gridTileWidth(width - BODY_X * 2, room.tiles.length);
  const banner = !joined ? (
    layout.access === 'offline' && <SystemBanner kind="offline" />
  ) : !room.online || here?.link === 'reconnecting' ? (
    <SystemBanner kind="reconnecting" />
  ) : (
    room.denied.mic && (
      <SystemBanner
        kind="mic-denied"
        onOpenSettings={() => void micPermission.openSettings()}
      />
    )
  );

  return (
    <Animated.View
      style={[
        styles.screen,
        session ? background : { backgroundColor: colors.bg },
      ]}
    >
      <IntentRunner
        intent={intent}
        onJoin={() => void join()}
        onLeave={leave}
      />
      <ChannelHeader
        icon={channelIcon(channel)}
        title={channel.name}
        onMenu={onOpenLeft}
      />
      {banner}
      <View style={styles.body}>
        {session ? (
          <RoomSessionBody
            session={session}
            offsetMs={offsetMs}
            now={now}
            meId={meId}
            joined={joined}
            canManage={canManage}
            syncing={syncing}
            // `not-joined-other-session`: my own Solo / Room Session counts seconds in the MiniPlayer.
            otherSession={
              !joined && (soloRunning || (!!myCall && hasSessionElsewhere))
            }
            tiles={room.tiles}
            nameOf={room.nameOf}
            onToastTop={(y) => setToastTop(space[2] + y)}
            // ponytail: the right drawer's member tab opens from here with P3-B7.2 (#161).
            onMore={() => {}}
          />
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.grid}>
              <VideoGrid>
                {room.tiles.map((tile) => (
                  <ParticipantTile
                    key={tile.userId}
                    name={tile.name}
                    avatar={tile.avatar}
                    self={tile.self}
                    mic={tile.mic}
                    speaking={tile.speaking}
                    away={tile.away}
                    poorNetwork={tile.poorNetwork}
                    width={tileWidth}
                    video={
                      tile.camera ? (
                        <ParticipantVideo
                          userId={tile.userId}
                          mirror={tile.self}
                        />
                      ) : undefined
                    }
                  />
                ))}
              </VideoGrid>
            </ScrollView>
            {layout.start !== 'none' && layout.access === 'ok' && (
              <View style={[styles.startBar, { borderColor: colors.border }]}>
                <Text style={styles.flex}>
                  {layout.start === 'hint'
                    ? t('voice.noSessionJoin')
                    : layout.start === 'managers-only'
                      ? t('voice.managersOnly')
                      : t('voice.noSession')}
                </Text>
                {layout.start === 'start' && (
                  <Button
                    label={t('voice.startSession')}
                    size="S"
                    onPress={() => setStarting(true)}
                  />
                )}
              </View>
            )}
          </>
        )}
        {joined ? (
          <View style={styles.controls}>
            {toggles}
            {session && sessionButtons()}
            <RoomControl
              icon={LogOut}
              label={t('voice.leave')}
              onPress={leave}
            />
          </View>
        ) : layout.access === 'ok' ? (
          <View style={styles.preview}>
            {previewCamera && (
              // CR-22 #4: floats over the grid, 16 from the edge and the buttons, never pushes.
              <View style={styles.selfTile}>
                <ParticipantTile
                  name=""
                  self
                  mic={null}
                  width={size.videoTileSelf}
                  video={<CameraPreview />}
                />
              </View>
            )}
            {(layout.mic || layout.camera) && (
              <View style={styles.toggles}>{toggles}</View>
            )}
            <View style={styles.cta}>
              <Button
                label={t(room.elsewhere ? 'voice.switchHere' : 'voice.join')}
                size="L"
                fullWidth
                oneLine
                // Board C-17 preview row: the button's sides are 12, not 16.
                style={styles.ctaButton}
                loading={joining || here?.phase === 'joining'}
                onPress={() => void join()}
              />
            </View>
          </View>
        ) : (
          <View style={styles.locked}>
            <Button label={t('voice.join')} size="L" fullWidth disabled />
            <Text variant="label" color="text-secondary" style={styles.center}>
              {t(
                layout.access === 'offline'
                  ? 'voice.offline'
                  : 'voice.noConnect',
              )}
            </Text>
          </View>
        )}
      </View>
      <CycleSheet
        // A fresh sheet each time, on the room's default (S-ROOM-03 `default`).
        key={String(starting)}
        visible={starting && !session}
        mode="room"
        initial={defaultCycle}
        people={room.tiles.length}
        loading={start.isPending}
        // S-ROOM-03 `solo-confirm`: a Dialog over the sheet first while a Solo runs.
        onSubmit={(cycle) =>
          soloRunning ? setConfirm({ kind: 'solo-start', cycle }) : begin(cycle)
        }
        onDismiss={() => setStarting(false)}
      />
      {session && (
        <RoomControlSheet
          visible={controlling}
          next={nextPhaseOf(roomTimer(session, offsetMs, now))}
          people={room.tiles.length}
          host={
            session.host_id && session.host_id !== meId
              ? room.nameOf(session.host_id)
              : null
          }
          onSkip={() => {
            setControlling(false);
            act.mutate({ id: session.id, action: { action: 'skip' } });
          }}
          onEdit={() => {
            setControlling(false);
            setEditing(true);
          }}
          onStop={() => {
            setControlling(false);
            setConfirm({ kind: 'stop' });
          }}
          onDismiss={() => setControlling(false)}
        />
      )}
      {session && (
        <CycleSheet
          key={`edit-${String(editing)}`}
          visible={editing}
          mode="edit"
          initial={session.next_cycle_config ?? session.cycle_config}
          loading={act.isPending}
          onSubmit={(cycle_config) =>
            act.mutate(
              { id: session.id, action: { action: 'config', cycle_config } },
              { onSuccess: () => setEditing(false) },
            )
          }
          onDismiss={() => setEditing(false)}
        />
      )}
      <Dialog
        visible={confirm !== null}
        title={
          confirm?.kind === 'solo-join'
            ? t('room.soloJoin.title')
            : confirm?.kind === 'solo-start'
              ? t('room.soloStart.title')
              : confirm?.kind === 'stop'
                ? room.tiles.length > 1
                  ? t('room.confirm.stopTitle', { n: room.tiles.length })
                  : t('room.confirm.stopTitleAlone')
                : t('room.confirm.leaveTitle')
        }
        body={
          confirm?.kind === 'solo-join'
            ? soloJoinBody()
            : confirm?.kind === 'solo-start'
              ? t('room.soloStart.body', { minutes: soloMinutes() })
              : confirm?.kind === 'stop'
                ? t('room.confirm.stopBody')
                : confirm?.successor
                  ? t('room.confirm.successor', {
                      name: room.nameOf(confirm.successor),
                    })
                  : t('room.confirm.noSuccessor')
        }
        row={confirm?.kind === 'leave' || confirm?.kind === 'switch'}
        error={act.isError ? t('room.confirm.failed') : null}
        confirm={
          confirm?.kind === 'solo-join' || confirm?.kind === 'solo-start'
            ? {
                label: t(
                  confirm.kind === 'solo-join'
                    ? 'room.soloJoin.confirm'
                    : 'room.soloStart.confirm',
                ),
                onPress: () => {
                  setConfirm(null);
                  expectSoloEnd();
                  if (confirm.kind === 'solo-start') begin(confirm.cycle, true);
                  else void join(true);
                },
              }
            : confirm?.kind === 'stop'
              ? {
                  label: t('room.confirm.stop'),
                  variant: 'danger',
                  loading: act.isPending,
                  onPress: () =>
                    session &&
                    act.mutate(
                      { id: session.id, action: { action: 'stop' } },
                      { onSuccess: () => setConfirm(null) },
                    ),
                }
              : {
                  label: t(
                    confirm?.kind === 'switch'
                      ? 'room.confirm.switch'
                      : 'room.confirm.leave',
                  ),
                  onPress: () => {
                    const kind = confirm?.kind;
                    setConfirm(null);
                    if (kind === 'switch') void join(true);
                    else leaveNow();
                  },
                }
        }
        cancel={{
          label: t(
            confirm?.kind === 'leave' || confirm?.kind === 'switch'
              ? 'room.confirm.stay'
              : 'room.confirm.cancel',
          ),
          onPress: () => {
            act.reset();
            setConfirm(null);
          },
        }}
        onDismiss={() => {
          if (act.isPending) return;
          act.reset();
          setConfirm(null);
        }}
      />
      <RoomSummarySheet
        end={joined && !session ? summary : null}
        meId={meId}
        nameOf={room.nameOf}
        onStay={() => dropSummary(channelId)}
        onLeave={leaveNow}
      />
      <MediaSheet
        sheet={media.sheet}
        onContinue={() => void media.onContinue()}
        onSettings={media.onSettings}
        onLater={media.onLater}
      />
      <Dialog
        visible={otherDevice}
        title={t('voice.otherDevice.title')}
        // S-ROOM-EDGE `other-device`: back in with the mic off; the other phone is put out.
        confirm={{
          label: t('voice.otherDevice.rejoin'),
          onPress: () => {
            voiceNotice.setState({ otherDevice: null });
            void rejoin();
          },
        }}
        cancel={{
          label: t('voice.otherDevice.close'),
          onPress: () => voiceNotice.setState({ otherDevice: null }),
        }}
        onDismiss={() => voiceNotice.setState({ otherDevice: null })}
      />
      <CameraPreviewSheet
        visible={selfPreview}
        onTurnOn={() => {
          setSelfPreview(false);
          void voiceSession.setCamera(true);
        }}
        onDismiss={() => setSelfPreview(false)}
      />
    </Animated.View>
  );
}

// A "Vào" / "Rời phòng" pressed on another screen (tab Học, MiniPlayer), run here with this
// screen's questions (S-ROOM-06, S-ROOM-05 `host-leave`).
function IntentRunner({
  intent,
  onJoin,
  onLeave,
}: {
  intent: 'join' | 'leave' | null;
  onJoin: () => void;
  onLeave: () => void;
}) {
  useEffect(() => {
    if (!intent) return;
    clearVoiceIntent();
    if (intent === 'join') onJoin();
    else onLeave();
    // Once per intent; the handlers are this render's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);
  return null;
}

// DESIGN.md › Motion "Cả phòng thở ra": the room crossfades to the new phase colour in `long`
// (Giảm chuyển động: a 200 crossfade).
const LIVE_PHASE_MS = 2000;

function useRoomBackground(
  phase: keyof typeof phaseRoomColor | null,
  live: boolean,
) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const target = phase ? colors[phaseRoomColor[phase]] : colors.bg;
  const color = useSharedValue(target);
  useEffect(() => {
    color.set(
      live
        ? withTiming(target, {
            duration: reduced ? motion.short : motion.long,
          })
        : target,
    );
    // Only the colour changing animates; `live` just says how.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduced, color]);
  return useAnimatedStyle(() => ({ backgroundColor: color.value }));
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: {
    flex: 1,
    paddingTop: space[2],
    paddingHorizontal: BODY_X,
    paddingBottom: space[3],
    gap: space[3],
  },
  grid: { paddingBottom: space[2] },
  startBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
    borderWidth: 1,
    borderRadius: radius.button,
    paddingVertical: space[2] + space[1],
    paddingHorizontal: space[3],
  },
  flex: { flex: 1 },
  // Board: Mic · Camera · Rời phòng spread with half a gap at the ends.
  controls: { flexDirection: 'row', justifyContent: 'space-around' },
  // CR-22 #4: Mic · Camera, then "Vào phòng" takes the rest, its top on the discs' top + 4.
  preview: { flexDirection: 'row', gap: space[3] },
  toggles: { flexDirection: 'row', gap: space[2] },
  selfTile: {
    position: 'absolute',
    right: 0,
    bottom: '100%',
    marginBottom: space[3],
  },
  cta: { flex: 1, paddingTop: space[1] },
  ctaButton: { paddingHorizontal: space[2] + space[1] },
  locked: { gap: space[2] },
  center: { textAlign: 'center' },
});
