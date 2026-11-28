import { myFocusedSeconds } from '@nezfocus/shared';
import { localMessages, messageStore } from '../data/messages';
import { voiceSession } from '../data/voice';
import {
  closeMemberProfile,
  profileSheet,
} from '../domain/friends/profileSheet';
import { onGatewayEvent } from '../domain/gateway/gatewayStore';
import {
  closeInviteSheet,
  inviteSheetStore,
} from '../domain/invites/inviteSheetStore';
import { drafts } from '../domain/messages/drafts';
import {
  homeStore,
  openChannel,
  selectServer,
} from '../domain/servers/homeStore';
import { removalStore, studiedMinutes } from '../domain/servers/removal';
import { sessionStore } from '../domain/session/sessionStore';
import { dropSummary, roomSessionsStore } from '../domain/study/roomSessions';
import type { VoiceTarget } from '../domain/voice/voiceSession';
import { voiceStore } from '../domain/voice/voiceSession';
import { closeVoice, voiceView } from '../domain/voice/voiceView';

// A seat the backend ended for a kick / ban may come just before the SERVER_MEMBER_REMOVE.
const SEAT_KEPT_MS = 10_000;

// REQ-ROLE-05 (CR-17 #14, #17): kicked or banned while the app is open. Everything of the
// server goes first — the room, sheets, drafts, unsent messages, the rail — then the Dialog.
// Started before the home lifecycle, so the server's name and channels are still there.
export function startRemovalLifecycle() {
  let endedSeat: (VoiceTarget & { at: number }) | null = null;
  const stopEnded = voiceSession.onEnded((end) => {
    if (end.reason === 'kicked' || end.reason === 'banned')
      endedSeat = { ...end, at: Date.now() };
  });

  const stopEvents = onGatewayEvent((e) => {
    if (e.t !== 'SERVER_MEMBER_REMOVE' || !e.d.action) return;
    if (e.d.user_id !== sessionStore.getState().user?.id) return;
    const serverId = e.d.server_id;
    const home = homeStore.getState();
    const serverName = home.servers?.find((s) => s.id === serverId)?.name ?? '';

    // `banned-in-room`: the minutes of the Room Session I was in, before anything is dropped.
    const call = voiceStore.getState().call;
    const seat =
      call?.serverId === serverId
        ? call
        : endedSeat?.serverId === serverId &&
            Date.now() - endedSeat.at < SEAT_KEPT_MS
          ? endedSeat
          : null;
    const { byChannel, offsetMs } = roomSessionsStore.getState();
    const session = seat && byChannel[seat.channelId];
    const seconds = session
      ? myFocusedSeconds(session, offsetMs, Date.now())
      : null;

    if (call?.serverId === serverId) void voiceSession.leave();
    if (voiceView.getState().open?.serverId === serverId) closeVoice();
    if (seat) dropSummary(seat.channelId);
    if (profileSheet.getState().target?.serverId === serverId)
      closeMemberProfile();
    if (inviteSheetStore.getState().serverId === serverId) closeInviteSheet();
    for (const c of home.channels[serverId] ?? []) drafts.drop(c.id);
    void messageStore.dropServer(serverId);

    // AC6: on that server → the next one on the rail, at the channel opened last there.
    if (home.selectedServerId === serverId)
      queueMicrotask(() => {
        const next = homeStore.getState().selectedServerId;
        if (!next) return;
        void localMessages
          .lastOpened(next)
          .catch(() => null)
          .then((channelId) =>
            channelId
              ? openChannel({ serverId: next, channelId })
              : selectServer(next),
          );
      });

    removalStore.setState({
      pending: {
        serverId,
        serverName,
        action: e.d.action,
        reason: e.d.reason ?? null,
        minutes: studiedMinutes(seconds),
      },
    });
  });

  return () => {
    stopEnded();
    stopEvents();
  };
}
