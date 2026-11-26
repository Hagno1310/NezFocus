// S-HOME-04: which rows the sheet of a sent message has, for this viewer. A failed message
// (`failed-message`) has its own two rows in ChatView.
export type SheetRow = 'reply' | 'edit' | 'copyText' | 'report' | 'delete';

export type SheetTarget = { mine: boolean; system: boolean; hasText: boolean };

export type SheetViewer = {
  inDm: boolean;
  canManage: boolean; // MANAGE_MESSAGES in this channel
  canReact: boolean; // ADD_REACTIONS (a DM: always)
  timedOut: boolean;
  online: boolean;
};

export type MessageSheet = {
  // `disabled`: offline (CR-28 #7), shown with its reason.
  reactions: 'on' | 'off' | 'disabled';
  rows: { row: SheetRow; disabled: boolean }[];
};

// Needs the network: CR-28 #7 (chốt 26/11/2026, 02 S-HOME-04).
const NEEDS_NETWORK: ReadonlySet<SheetRow> = new Set([
  'edit',
  'delete',
  'report',
]);

// null: long-press opens nothing (a system message one cannot delete, MSG-11).
export function messageSheet(
  target: SheetTarget,
  viewer: SheetViewer,
): MessageSheet | null {
  const canDelete =
    !viewer.inDm && viewer.canManage ? true : !target.system && target.mine;
  let rows: SheetRow[];
  let reactions: MessageSheet['reactions'];
  if (target.system) {
    if (!canDelete) return null;
    rows = ['delete'];
    reactions = 'off';
  } else if (viewer.timedOut && !viewer.inDm) {
    // `timed-out`: no reactions, no Trả lời; own message still deletable (CR-28 #27).
    rows = [
      ...(target.hasText ? ['copyText' as const] : []),
      target.mine ? 'delete' : 'report',
    ];
    if (!target.mine && canDelete) rows.push('delete');
    reactions = 'off';
  } else {
    rows = [
      'reply',
      ...(target.mine ? ['edit' as const] : []),
      ...(target.hasText ? ['copyText' as const] : []),
      ...(target.mine ? [] : ['report' as const]),
      ...(canDelete ? ['delete' as const] : []),
    ];
    reactions = viewer.inDm || viewer.canReact ? 'on' : 'off';
  }
  if (!viewer.online && reactions === 'on') reactions = 'disabled';
  return {
    reactions,
    rows: rows.map((row) => ({
      row,
      disabled: !viewer.online && NEEDS_NETWORK.has(row),
    })),
  };
}
