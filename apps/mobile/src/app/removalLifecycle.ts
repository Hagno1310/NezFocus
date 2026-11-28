import { voiceSession } from '../data/voice';
import { onGatewayEvent } from '../domain/gateway/gatewayStore';
import { homeStore } from '../domain/servers/homeStore';
import { sessionStore } from '../domain/session/sessionStore';
import { noteEndedSeat, serverGone } from '../features/servers/serverGone';

// Started before the home lifecycle, so the server's name and channels are still there.
export function startRemovalLifecycle() {
  const stopEnded = voiceSession.onEnded((end) => {
    if (end.reason === 'kicked' || end.reason === 'banned') noteEndedSeat(end);
  });

  const stopEvents = onGatewayEvent((e) => {
    const me = sessionStore.getState().user?.id;
    if (e.t === 'SERVER_MEMBER_REMOVE' && e.d.user_id === me)
      // No action: I left, here or on another device — no Dialog (SRV-05 AC5).
      serverGone(e.d.server_id, e.d.action ?? 'left', e.d.reason ?? null);
    if (e.t === 'SERVER_DELETE') {
      const owner = homeStore
        .getState()
        .servers?.find((s) => s.id === e.d.id)?.owner_id;
      // The Owner deleted it (here, or on another device): no "đã bị xóa" Dialog.
      serverGone(e.d.id, owner === me ? 'deleted_here' : 'deleted');
    }
  });

  return () => {
    stopEnded();
    stopEvents();
  };
}
