import {
  CYCLE_PRESETS,
  Permission,
  hasPermission,
  type CycleConfig,
} from '@nezfocus/shared';
import {
  LogOut,
  Mic,
  MicOff,
  Pause,
  Play,
  SlidersHorizontal,
  Video,
  VideoOff,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
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
import { closeVoice, openVoice } from '../../../domain/voice/voiceView';
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
  leftToast,
  roomControls,
  successorOf,
} from '../../../domain/study/roomView';
import {
  dropSummary,
  roomSessionsStore,
} from '../../../domain/study/roomSessions';
import { homeStore } from '../../../domain/servers/homeStore';
import { seatsIn } from '../../../domain/voice/voiceRooms';
import { voiceStore } from '../../../domain/voice/voiceSession';
import {
  myFocusedSeconds,
  roomTimer,
  type FocusPhase,
  type RoomTimer,
} from '@nezfocus/shared';
import { CameraPreviewSheet } from '../components/CameraPreviewSheet';
import { MediaSheet } from '../components/MediaSheet';
import { useMediaFlow } from '../hooks/useMediaFlow';
import { useVoiceRoom } from '../hooks/useVoiceRoom';

const BODY_X = space[3];
const TOAST_NAME_MAX = 24; // S-ROOM-05 › Rời phòng: the room name in a Toast

// By code point, so an emoji is never cut in half.
const shortName = (name: string) => {
  const chars = Array.from(name);
  return chars.length > TOAST_NAME_MAX
    ? `${chars.slice(0, TOAST_NAME_MAX).join('')}…`
    : name;
};

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
  const syncing = useStore(gatewayStore, (s) => s.banner !== null);
  const now = useNow().getTime();
  const [starting, setStarting] = useState(false);
  const [controlling, setControlling] = useState(false);
  const [editing, setEditing] = useState(false);
  // S-ROOM-05: `stop`, or leaving / switching as the Host of the running session.
  const [confirm, setConfirm] = useState<
    | null
    | { kind: 'stop' }
    | { kind: 'leave' | 'switch'; successor: string | null }
  >(null);
  const act = useRoomAction();
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
  const start = useStartRoomSession(channelId, (f) => {
    setStarting(false);
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
  const background = useRoomBackground(
    session ? roomTimer(session, offsetMs, now).phase : null,
  );
  const otherDevice = useStore(
    voiceNotice,
    (s) => s.otherDevice?.channelId === channelId,
  );

  const { channel, layout, here, joined } = room;
  if (!channel || !layout) return null;
  const target = { serverId, channelId };
  const canManage = hasPermission(room.perms, Permission.MANAGE_STUDY_ROOMS);
  const defaultCycle: CycleConfig =
    channel.default_cycle_config ?? CYCLE_PRESETS['25/5'];

  const tell = (result: JoinResult, retry: () => void) => {
    if (result === 'no-connect') showToast({ message: t('voice.noConnect') });
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

  // S-ROOM-05 › Rời phòng: back to the channel before, with my minutes if I took part
  // ("Đã rời {phòng} · {31} phút đã được tính · Vào lại").
  const leaveNow = () => {
    const seconds = session?.me
      ? myFocusedSeconds(session, offsetMs, Date.now())
      : (summary?.focused_seconds ?? null);
    const left = leftToast(seconds);
    const name = shortName(channel.name);
    void voiceSession.leave();
    closeVoice();
    dropSummary(channelId);
    showToast({
      message:
        left.key === 'leftMinutes'
          ? t('room.leftMinutes', { name, minutes: left.minutes })
          : left.key === 'leftNone'
            ? t('room.leftNone', { name })
            : t('voice.left', { name }),
      action: {
        label: t('voice.rejoin'),
        onPress: () => void rejoin(),
      },
    });
  };
  const successorHere = () =>
    successorOf(room.seats, meId, channel.focus_control, (id) =>
      hasPermission(room.permsOf(id), Permission.MANAGE_STUDY_ROOMS),
    );
  // A Participant leaves without a question; the Host of the running session confirms who takes
  // over (`host-leave` / `no-successor`).
  const leave = () => {
    if (session && session.host_id === meId)
      setConfirm({ kind: 'leave', successor: successorHere() });
    else leaveNow();
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
    const role = roomControls({
      session,
      timer: roomTimer(session, offsetMs, now),
      meId,
      joined,
      canManage,
      others: 0,
      syncing,
      justJoined: false,
      todayMinutes: 0,
    });
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
        onSubmit={(cycle_config) =>
          start.mutate(
            { cycle_config },
            { onSuccess: () => setStarting(false) },
          )
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
          confirm?.kind === 'stop'
            ? room.tiles.length > 1
              ? t('room.confirm.stopTitle', { n: room.tiles.length })
              : t('room.confirm.stopTitleAlone')
            : t('room.confirm.leaveTitle')
        }
        body={
          confirm?.kind === 'stop'
            ? t('room.confirm.stopBody')
            : confirm?.successor
              ? t('room.confirm.successor', {
                  name: room.nameOf(confirm.successor),
                })
              : t('room.confirm.noSuccessor')
        }
        row={confirm?.kind !== 'stop'}
        error={act.isError ? t('room.confirm.failed') : null}
        confirm={
          confirm?.kind === 'stop'
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
            confirm?.kind === 'stop'
              ? 'room.confirm.cancel'
              : 'room.confirm.stay',
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

// S-ROOM-04 "Bỏ qua pha": where a skip lands (focus → its break, a break → focus).
const nextPhaseOf = (timer: RoomTimer): FocusPhase =>
  timer.status === 'running' && timer.next
    ? timer.next.phase
    : timer.phase === 'focus'
      ? 'short_break'
      : 'focus';

// DESIGN.md › Motion "Cả phòng thở ra": the room crossfades to the new phase colour in `long`
// (Giảm chuyển động: a 200 crossfade).
function useRoomBackground(phase: keyof typeof phaseRoomColor | null) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const target = phase ? colors[phaseRoomColor[phase]] : colors.bg;
  const color = useSharedValue(target);
  useEffect(() => {
    color.set(
      withTiming(target, {
        duration: reduced ? motion.short : motion.long,
      }),
    );
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
