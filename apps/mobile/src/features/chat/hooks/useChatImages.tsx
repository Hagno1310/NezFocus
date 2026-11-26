import { Download } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import {
  imageAuth,
  imageSource,
  loadImageToken,
  refreshImageToken,
} from '../../../data/attachments/imageAuth';
import { saveImage } from '../../../data/attachments/saveImage';
import { fileSize } from '../../../domain/attachments/tray';
import type { ChatItem } from '../../../domain/messages/messageStore';
import type { ChatImage } from '../../../shared/ui/MessageImages';
import { MediaViewer, type ViewerImage } from '../../../shared/ui/MediaViewer';
import { showToast } from '../../../shared/ui/Toast';
import { chatCover } from './useReadTracking';

type Shown = {
  chat: ChatImage;
  viewer: ViewerImage;
  save: Parameters<typeof saveImage>[0];
};

type Open = {
  images: Shown[];
  start: number;
  sender: { name: string; avatarUri: string | null };
  time: string;
};

// REQ-MSG-04 images of chat messages: thumbnails in the list (C-10), the originals in C-36
// (S-HOME-11), "Tải về" into Download. A pending message shows the photos on the phone.
export function useChatImages() {
  const { t } = useTranslation();
  const token = useStore(imageAuth, (s) => s.token);
  useEffect(() => {
    void loadImageToken();
  }, []);
  const [open, setOpen] = useState<Open | null>(null);
  // NOTIF-01: the viewer covers the chat, so nothing is read meanwhile.
  useEffect(() => {
    chatCover.setState({ viewing: open !== null });
    return () => chatCover.setState({ viewing: false });
  }, [open]);

  const shownOf = (item: ChatItem): Shown[] => {
    if (item.kind === 'message')
      return item.message.attachments.map((a) => ({
        chat: {
          key: a.id,
          source: imageSource(a.thumbnail_url, `att:${a.id}:thumbnail`, token),
          width: a.width,
          height: a.height,
        },
        viewer: {
          key: a.id,
          source: imageSource(a.url, `att:${a.id}:original`, token),
          placeholder: imageSource(
            a.thumbnail_url,
            `att:${a.id}:thumbnail`,
            token,
          ),
          name: a.filename,
          detail: `${a.filename} · ${fileSize(a.size_bytes)}`,
        },
        save: {
          path: a.url,
          localUri: null,
          name: a.filename,
          type: a.content_type,
        },
      }));
    return item.entry.attachments
      .filter((a) => !a.blocked)
      .map(({ key, file }) => ({
        chat: {
          key,
          source: { uri: file.uri },
          width: file.width,
          height: file.height,
        },
        viewer: {
          key,
          source: { uri: file.uri },
          placeholder: { uri: file.uri },
          name: file.name,
          detail: `${file.name} · ${fileSize(file.size)}`,
        },
        save: {
          path: null,
          localUri: file.uri,
          name: file.name,
          type: file.type,
        },
      }));
  };

  const download = (target: Shown['save']) =>
    saveImage(target).then(
      () => showToast({ icon: Download, message: t('chat.viewer.saved') }),
      () => showToast({ message: t('chat.cannotConnect') }),
    );

  return {
    imagesOf: (item: ChatItem) => shownOf(item).map((s) => s.chat),
    open: (
      item: ChatItem,
      start: number,
      sender: Open['sender'],
      time: string,
    ) => setOpen({ images: shownOf(item), start, sender, time }),
    // A thumbnail answered 401: the token expired; one refresh redraws them.
    onImageError: () => void refreshImageToken(),
    viewer: open && (
      <MediaViewer
        images={open.images.map((s) => s.viewer)}
        start={open.start}
        sender={open.sender}
        time={open.time}
        onClose={() => setOpen(null)}
        onDownload={(i) => {
          const target = open.images[i]?.save;
          if (target) void download(target);
        }}
        onError={() => void refreshImageToken()}
      />
    ),
  };
}
