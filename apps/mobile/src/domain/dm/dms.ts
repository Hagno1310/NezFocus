import { imagesOnly } from '../messages/content';
import type { DispatchEvent, DmChannel, StudyActivity } from '@nezfocus/shared';
import { newerId } from '../messages/unread';

export type DmState = { byId: Record<string, DmChannel>; loaded: boolean };

export const emptyDms: DmState = { byId: {}, loaded: false };

// Snowflakes order by time: a DM with no message yet sorts by when it was made.
const activityOf = (d: DmChannel) => d.last_message_id ?? d.id;

export const sortedDms = (s: DmState) =>
  Object.values(s.byId).sort((a, b) =>
    newerId(activityOf(a), activityOf(b)) ? -1 : 1,
  );

export function reduceDms(s: DmState, e: DispatchEvent): DmState {
  switch (e.t) {
    case 'READY':
      return {
        loaded: true,
        byId: Object.fromEntries(e.d.private_channels.map((d) => [d.id, d])),
      };
    case 'CHANNEL_CREATE':
      if (!('type' in e.d) || e.d.type !== 'dm') return s;
      return { ...s, byId: { ...s.byId, [e.d.id]: e.d } };
    case 'MESSAGE_CREATE': {
      const known = e.d.server_id === null && s.byId[e.d.channel_id];
      if (!known) return s;
      const { server_id: _, ...message } = e.d;
      return {
        ...s,
        byId: {
          ...s.byId,
          [known.id]: {
            ...known,
            last_message_id: message.id,
            last_message: message,
          },
        },
      };
    }
    // REQ-MSG-05 AC1: line 2 shows the last message as edited.
    case 'MESSAGE_UPDATE': {
      const dm = s.byId[e.d.channel_id];
      const last = dm?.last_message;
      if (e.d.server_id !== null || !dm || last?.id !== e.d.id) return s;
      const { content, edited_at, mention_user_ids, mention_role_ids } = e.d;
      return withDm(s, {
        ...dm,
        last_message: {
          ...last,
          content,
          edited_at,
          mention_user_ids,
          mention_role_ids,
          mention_everyone: e.d.mention_everyone,
        },
      });
    }
    // AC3: the message before it is not known here, so no line 2 until the next READY brings
    // it; last_message_id stays so the row keeps its place.
    case 'MESSAGE_DELETE': {
      const dm = s.byId[e.d.channel_id];
      if (e.d.server_id !== null || dm?.last_message?.id !== e.d.id) return s;
      return withDm(s, { ...dm, last_message: null });
    }
    default:
      return s;
  }
}

const withDm = (s: DmState, dm: DmChannel): DmState => ({
  ...s,
  byId: { ...s.byId, [dm.id]: dm },
});

export const closeDm = (s: DmState, id: string): DmState => {
  const { [id]: _, ...byId } = s.byId;
  return { ...s, byId };
};

export type DmLine2 =
  // `image`: only images, read "Đã gửi một ảnh" (REQ-MSG-04).
  | {
      kind: 'message';
      text: string;
      image: boolean;
      own: boolean;
      bold: boolean;
    }
  | { kind: 'activity'; activity: StudyActivity }
  | { kind: 'none' };

// S-DM-01 › Nội dung chữ (CR-25 #16): unread message > their study activity > last message.
export function dmLine2(
  dm: DmChannel,
  o: { meId: string | null; unread: boolean; activity: StudyActivity | null },
): DmLine2 {
  const last = dm.last_message;
  if (o.activity && !o.unread && !dm.recipient.deleted)
    return { kind: 'activity', activity: o.activity };
  if (!last) return { kind: 'none' };
  // ponytail: call lines come with P3-B6.3 (#157).
  return {
    kind: 'message',
    text: last.content,
    image: imagesOnly(last),
    own: last.author.id === o.meId,
    bold: o.unread,
  };
}
