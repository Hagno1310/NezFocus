import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  MESSAGE_ATTACHMENT_MAX_BYTES,
} from '@nezfocus/shared';
import type { Upload } from './uploads';

// A photo from the picker or the camera, ready to upload (HEIC already JPEG, SRS 7.3.5).
export type PickedImage = {
  uri: string;
  name: string;
  size: number;
  type: string;
  width: number;
  height: number;
};

// S-HOME-05 `too-large` (MSG-04 AC1: refused before uploading) and `too-many` (the first ones
// that fit next to what the tray already has).
export function admit(inTray: number, picked: readonly PickedImage[]) {
  const tooLarge = picked.filter((p) => p.size > MESSAGE_ATTACHMENT_MAX_BYTES);
  const fits = picked.filter((p) => p.size <= MESSAGE_ATTACHMENT_MAX_BYTES);
  const room = Math.max(0, MAX_ATTACHMENTS_PER_MESSAGE - inTray);
  return {
    accepted: fits.slice(0, room),
    tooLarge,
    tooMany: fits.length > room,
  };
}

export type TrayLine =
  | { kind: 'progress'; done: number; total: number }
  | { kind: 'rejected'; name: string }
  | { kind: 'failed' }
  | { kind: 'offline' }
  | { kind: 'fix' };

// C-11 › Dòng dưới khay. `sendTried`: ➤ was pressed while a tile is failed / blocked.
export function trayLine(
  items: readonly Upload[],
  sendTried: boolean,
): TrayLine | null {
  const has = (s: Upload['status']) => items.some((i) => i.status === s);
  if (sendTried && (has('rejected') || has('failed'))) return { kind: 'fix' };
  const rejected = items.find((i) => i.status === 'rejected');
  if (rejected) return { kind: 'rejected', name: rejected.file.name };
  if (has('failed')) return { kind: 'failed' };
  if (has('waiting')) return { kind: 'offline' };
  const done = items.filter((i) => i.status === 'done').length;
  return done < items.length
    ? { kind: 'progress', done, total: items.length }
    : null;
}

// S-HOME-05 `uploading`: ➤ works while tiles upload (the message waits as `pending`), and
// offline (CR-28 #29); a failed or blocked tile must be retried or removed first.
export const traySendable = (items: readonly Upload[]) =>
  !items.some((i) => i.status === 'failed' || i.status === 'rejected');

// C-29: "1,8 MB" — one decimal (the language's separator); under 1 MB in whole KB.
export function fileSize(bytes: number, locale: string) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1)
    return `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(mb)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
