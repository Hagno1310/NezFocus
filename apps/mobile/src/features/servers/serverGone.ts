import { myFocusedSeconds } from '@nezfocus/shared';
import { api } from '../../data/api';
import { uploads } from '../../data/attachments/uploads';
import { localMessages, messageStore } from '../../data/messages';
import { voiceSession } from '../../data/voice';
import {
  closeMemberProfile,
  profileSheet,
} from '../../domain/friends/profileSheet';
import {
  closeInviteSheet,
  inviteSheetStore,
} from '../../domain/invites/inviteSheetStore';
import { drafts } from '../../domain/messages/drafts';
import {
  applyGatewayEvent,
  homeStore,
  openChannel,
  selectServer,
} from '../../domain/servers/homeStore';
import {
  removalStore,
  studiedMinutes,
  type RemovalKind,
} from '../../domain/servers/removal';
import {
  dropSummary,
  roomSessionsStore,
} from '../../domain/study/roomSessions';
import type { VoiceTarget } from '../../domain/voice/voiceSession';
import { voiceStore } from '../../domain/voice/voiceSession';
import { closeVoice, voiceView } from '../../domain/voice/voiceView';

// A seat the backend ended for a kick / ban may come just before the SERVER_MEMBER_REMOVE.
const SEAT_KEPT_MS = 10_000;
let endedSeat: (VoiceTarget & { at: number }) | null = null;

// The removal lifecycle notes the seat a kick / ban ended (its minutes, `banned-in-room`).
export const noteEndedSeat = (seat: VoiceTarget) => {
  endedSeat = { ...seat, at: Date.now() };
};

// Everything of a server that went away goes first — the room, sheets, drafts, unsent
// messages and uploads, its requests, the rail — then the Dialog, if the kind has one
// (REQ-ROLE-05, SRV-05; CR-17 #14, #17). Twice for one server: the second does nothing.
export function serverGone(
  serverId: string,
  kind: RemovalKind,
  reason: string | null = null,
) {
  const home = homeStore.getState();
  const server = home.servers?.find((s) => s.id === serverId);
  if (!server) return;

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
  const seconds =
    session && (kind === 'kick' || kind === 'ban')
      ? myFocusedSeconds(session, offsetMs, Date.now())
      : null;

  if (call?.serverId === serverId) void voiceSession.leave();
  if (voiceView.getState().open?.serverId === serverId) closeVoice();
  if (seat) dropSummary(seat.channelId);
  if (profileSheet.getState().target?.serverId === serverId)
    closeMemberProfile();
  if (inviteSheetStore.getState().serverId === serverId) closeInviteSheet();
  const channelIds = (home.channels[serverId] ?? []).map((c) => c.id);
  for (const id of channelIds) drafts.drop(id);
  uploads.dropChannels(channelIds);
  // My own delete is still waiting for its answer on `/servers/{id}`.
  if (kind !== 'deleted_here')
    api.dropRequests([
      `/servers/${serverId}`,
      ...channelIds.map((id) => `/channels/${id}`),
    ]);
  void messageStore.dropServer(serverId);

  // AC6: on that server → the next one on the rail, at the channel opened last there.
  const wasShown = home.selectedServerId === serverId;
  applyGatewayEvent({ t: 'SERVER_DELETE', d: { id: serverId }, s: 0 });
  const next = homeStore.getState().selectedServerId;
  if (wasShown && next)
    void localMessages
      .lastOpened(next)
      .catch(() => null)
      .then((channelId) =>
        channelId
          ? openChannel({ serverId: next, channelId })
          : selectServer(next),
      );

  removalStore.setState({
    pending: {
      serverId,
      serverName: server.name,
      action: kind,
      reason,
      minutes: studiedMinutes(seconds),
    },
  });
}
