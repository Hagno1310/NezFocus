import {
  ErrorCode,
  type ChannelResponse,
  type ChannelUpdateEvent,
  type CycleConfig,
  type FocusControl,
  type UpdateChannelRequest,
} from '@nezfocus/shared';
import { asApiError } from '../auth/authFlow';
import type { ServerRepository } from './ServerRepository';

// The Room Session running in a Phòng học, as S-SET-07 needs it.
export type ActiveRoomSession = {
  participants: number;
  host_id: string | null;
};

// The line under "AI ĐƯỢC BẮT ĐẦU PHIÊN HỌC": `managers` (Host / anyone else, CR-28 #37) or `off`.
export type StudyRoomNote = 'hostKeeps' | 'controllerKeeps' | 'off';

// S-SET-07 `full-access` / `managers` / `off`.
export function studyRoomView(
  channel: Pick<ChannelResponse, 'focus_control'>,
  session: ActiveRoomSession | null,
  myId: string | null,
): {
  sessionPeople: number | null;
  note: StudyRoomNote | null;
  showCycle: boolean;
} {
  if (channel.focus_control === 'off')
    return { sessionPeople: null, note: 'off', showCycle: false };
  return {
    sessionPeople: session?.participants ?? null,
    // STUDY-11: switching to managers leaves the current Host in control until they leave.
    note:
      channel.focus_control === 'managers' && session
        ? session.host_id === myId
          ? 'hostKeeps'
          : 'controllerKeeps'
        : null,
    showCycle: true,
  };
}

// `switch-off-confirm` (S-ROOM-05 `focus-off`): only when turning off ends a session.
export const needsOffConfirm = (
  from: FocusControl,
  to: FocusControl,
  session: ActiveRoomSession | null,
) => to === 'off' && from !== 'off' && session !== null;

export type StudyRoomSave =
  | { ok: true; channel: ChannelResponse }
  // lost: 40302 / 40401 → the screen closes (Edge case); failed: `save-error`.
  | { ok: false; error: 'lost' | 'failed' };

export async function saveStudyRoom(
  repo: Pick<ServerRepository, 'updateChannel'>,
  channelId: string,
  body: Pick<UpdateChannelRequest, 'focus_control' | 'default_cycle_config'>,
): Promise<StudyRoomSave> {
  try {
    return { ok: true, channel: await repo.updateChannel(channelId, body) };
  } catch (err) {
    const code = asApiError(err)?.code;
    return {
      ok: false,
      error:
        code === ErrorCode.Forbidden || code === ErrorCode.NotFound
          ? 'lost'
          : 'failed',
    };
  }
}

// Field by field: jsonb gives the keys back in its own order.
const sameCycle = (a: CycleConfig | null, b: CycleConfig | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.focus_min === b.focus_min &&
    a.short_break_min === b.short_break_min &&
    a.long_break_min === b.long_break_min &&
    a.long_break_every === b.long_break_every);

// S-SET-EDGE `changed-by-other`: who to name in "Bình vừa đổi cài đặt phòng học", or null
// (my own save, a rename, a reorder — spec 08 › Edge case: "không toast nếu chính mình vừa lưu").
export function changedByOther(
  known: Pick<ChannelResponse, 'focus_control' | 'default_cycle_config'>,
  event: ChannelUpdateEvent,
  myId: string | null,
): string | null {
  if (event.updated_by === null || event.updated_by === myId) return null;
  const changed =
    event.focus_control !== known.focus_control ||
    !sameCycle(event.default_cycle_config, known.default_cycle_config);
  return changed ? event.updated_by : null;
}
