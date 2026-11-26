import type { ImagePickerAsset } from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import {
  releaseImage,
  toPickedImages,
} from '../../../data/attachments/pickedImages';
import { uploads } from '../../../data/attachments/uploads';
import {
  admit,
  traySendable,
  trayLine,
} from '../../../domain/attachments/tray';
import { setTray, trayOf, trays } from '../../../domain/attachments/trays';
import type { Upload, UploadRef } from '../../../domain/attachments/uploads';
import type { TrayTile } from '../../../shared/ui/AttachmentTray';
import { showToast } from '../../../shared/ui/Toast';

const NO_KEYS: readonly string[] = [];

// S-HOME-05 for one channel: `picking` → tiles that upload at once (C-29) → sent with the
// message (the outbox waits for them, CR-28 #29).
export function useAttachmentTray(channelId: string) {
  const { t } = useTranslation();
  const keys = useStore(trays, (s) => s[channelId] ?? NO_KEYS);
  const items = useStore(uploads.state, (s) => s.items);
  const tray = keys.flatMap((k) => (items[k] ? [items[k]] : [])) as Upload[];
  const [picking, setPicking] = useState(false);
  // ➤ pressed while a tile is failed / blocked: C-11 "Gỡ hoặc thử lại tệp lỗi để gửi".
  const [sendTried, setSendTried] = useState(false);

  const add = async (assets: ImagePickerAsset[]) => {
    const photos = await toPickedImages(assets).catch(() => null);
    if (!photos) return showToast({ message: t('chat.somethingWrong') });
    const { accepted, tooLarge, tooMany } = admit(
      trayOf(channelId).length,
      photos,
    );
    // S-MOD-04 queues them, one at a time; the size one names the first file (MSG-04 AC1).
    if (tooLarge[0])
      showToast({ message: t('chat.tooLarge', { name: tooLarge[0].name }) });
    if (tooMany) showToast({ message: t('chat.tooMany') });
    for (const p of photos) if (!accepted.includes(p)) releaseImage(p);
    if (!accepted.length) return;
    const added = accepted.map((p) => uploads.add(channelId, p));
    setTray(channelId, [...trayOf(channelId), ...added]);
    setSendTried(false);
  };

  const remove = (key: string) => {
    uploads.remove(key);
    setTray(
      channelId,
      trayOf(channelId).filter((k) => k !== key),
    );
    setSendTried(false);
  };

  const line = trayLine(tray, sendTried);
  const lineText = (() => {
    switch (line?.kind) {
      case undefined:
        return null;
      case 'progress':
        return { text: t('chat.trayProgress', line), danger: false };
      case 'rejected':
        return {
          text: t('chat.trayRejected', { name: line.name }),
          danger: true,
        };
      case 'failed':
        return { text: t('chat.trayFailed'), danger: true };
      case 'offline':
        return { text: t('chat.trayOffline'), danger: false };
      case 'fix':
        return { text: t('chat.trayFix'), danger: true };
    }
  })();

  const tiles: TrayTile[] = tray.map((u) => ({
    key: u.key,
    uri: u.file.uri,
    name: u.file.name,
    status: u.status,
    progress: u.progress,
  }));

  return {
    tiles,
    line: lineText,
    hasFiles: tray.length > 0,
    picking,
    openPicker: () => setPicking(true),
    closePicker: () => setPicking(false),
    add: (assets: ImagePickerAsset[]) => void add(assets),
    remove,
    retry: (key: string) => uploads.retry(key),
    // What goes with ➤, emptying the tray; null when a tile must be fixed first.
    take(): UploadRef[] | null {
      if (!tray.length) return [];
      if (!traySendable(tray)) {
        setSendTried(true);
        return null;
      }
      setTray(channelId, []);
      setSendTried(false);
      return tray.map((u) => ({
        key: u.key,
        file: u.file,
        attachmentId: u.attachmentId,
      }));
    },
  };
}
