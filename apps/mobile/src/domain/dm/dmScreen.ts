import type {
  LookupRelationship,
  VisibleStatus,
  StudyActivity,
} from '@nezfocus/shared';

export type DmScreen = {
  bottom: 'composer' | 'cannot' | 'blocked-by-me' | 'deleted';
  strip: 'not-friend' | 'request-received' | 'request-sent' | null;
  dot: boolean;
  sub:
    | { kind: 'activity'; activity: StudyActivity }
    | { kind: 'status'; status: 'online' | 'idle' | 'dnd' }
    | null;
};

const hidden = { strip: null, dot: false, sub: null } as const;

// S-DM-02 › Trạng thái. Every 40303 screen hides the dot and the sub-line, or it would show
// who blocked whom (spec 09, chốt 22/10/2026).
export function dmScreen(o: {
  deleted: boolean;
  relationship: LookupRelationship;
  canMessage: boolean;
  status: VisibleStatus;
  activity: StudyActivity | null;
}): DmScreen {
  if (o.deleted) return { bottom: 'deleted', ...hidden };
  if (o.relationship === 'blocked')
    return { bottom: 'blocked-by-me', ...hidden };
  if (!o.canMessage) return { bottom: 'cannot', ...hidden };
  const strip =
    o.relationship === 'none'
      ? 'not-friend'
      : o.relationship === 'incoming'
        ? 'request-received'
        : o.relationship === 'outgoing'
          ? 'request-sent'
          : null;
  const sub = o.activity
    ? { kind: 'activity' as const, activity: o.activity }
    : o.status === 'online' || o.status === 'idle' || o.status === 'dnd'
      ? { kind: 'status' as const, status: o.status }
      : null;
  return { bottom: 'composer', strip, dot: true, sub };
}
