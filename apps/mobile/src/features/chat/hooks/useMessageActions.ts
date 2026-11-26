import {
  ErrorCode,
  type MessageAuthor,
  type MessageResponse,
} from '@nezfocus/shared';
import * as Clipboard from 'expo-clipboard';
import {
  CircleAlert,
  Copy,
  MessageSquareX,
  Timer,
  WifiOff,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Vibration } from 'react-native';
import { localKv } from '../../../data/db/kv';
import { messageStore } from '../../../data/messages';
import { messageLinkOf } from '../../../domain/messages/links';
import type { Lifted } from '../../../shared/ui/Overlay';
import { showToast } from '../../../shared/ui/Toast';

const RECENT_KEY = 'emoji.recent';
const RECENT_MAX = 8; // one row of the picker (frame `emoji-picker`)

// C-10 / S-HOME-04: "rung nhẹ".
const buzz = () => Vibration.vibrate(10);

export type Target = { message: MessageResponse; lifted?: Lifted };
// The picker reacts to a message, or (no message) puts the emoji in the Composer.
type PickerFor = Target | { message?: undefined; lifted?: undefined };

// REQ-MSG-05 on the chat screen: the sheet and what it opens, reply / edit mode, reactions,
// and the Toasts of S-HOME-04 › Tương tác for each failure.
// `onBegin`: reply / edit mode starts (the composer fills and focuses there, not in an effect).
export function useMessageActions(
  channelId: string,
  serverId: string | null,
  onBegin?: (kind: 'reply' | 'edit', message: MessageResponse) => void,
) {
  const { t } = useTranslation();
  const [sheet, setSheet] = useState<Target | null>(null);
  const [picker, setPicker] = useState<PickerFor | null>(null);
  const [deleting, setDeleting] = useState<Target | null>(null);
  const [reactors, setReactors] = useState<{
    message: MessageResponse;
    emoji: string;
    people: MessageAuthor[] | null; // null while loading
  } | null>(null);
  const [context, setContext] = useState<{
    kind: 'reply' | 'edit';
    message: MessageResponse;
  } | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    void localKv
      .get<string[]>(RECENT_KEY)
      .then((r) => setRecent(r ?? []))
      .catch(() => {});
  }, []);

  // S-HOME-04 › Tương tác, 10 S-MOD-04 Toast chung theo mã.
  const failed = useCallback(
    (err: unknown) => {
      const e = err as { code?: number; retry_after?: number | null };
      if (e.code === ErrorCode.MaxReactionsReached)
        showToast({ message: t('chat.maxReactions') });
      // REQ-MSG-10 AC2.
      else if (e.code === ErrorCode.MaxPinsReached)
        showToast({ message: t('chat.maxPins') });
      else if (
        e.code === ErrorCode.Forbidden ||
        e.code === ErrorCode.CannotMessageUser
      )
        showToast({ icon: CircleAlert, message: t('chat.noLongerAllowed') });
      else if (e.code === ErrorCode.RateLimited)
        showToast({
          icon: Timer,
          message: t('chat.tooFast', {
            count: Math.max(1, Math.ceil(e.retry_after ?? 1)),
          }),
        });
      else if (e.code === ErrorCode.NotFound)
        showToast({ icon: MessageSquareX, message: t('chat.messageDeleted') });
      else showToast({ icon: WifiOff, message: t('chat.cannotConnect') });
    },
    [t],
  );

  const toggle = useCallback(
    (message: MessageResponse, emoji: string) => {
      buzz();
      void messageStore
        .toggleReaction(channelId, message.id, emoji)
        .catch(failed);
    },
    [channelId, failed],
  );

  // A pick from the quick row or the picker also goes to the recent row.
  const react = (message: MessageResponse, emoji: string) => {
    const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(
      0,
      RECENT_MAX,
    );
    setRecent(next);
    void localKv.set(RECENT_KEY, next).catch(() => {});
    toggle(message, emoji);
  };

  // CR-28 #26: who put this emoji; the answer of an older pick is dropped.
  const loadReactors = (message: MessageResponse, emoji: string) => {
    setReactors({ message, emoji, people: null });
    void messageStore
      .reactionUsers(channelId, message.id, emoji)
      .then((people) =>
        setReactors((r) =>
          r?.message.id === message.id && r.emoji === emoji
            ? { ...r, people }
            : r,
        ),
      )
      .catch((err: unknown) => {
        setReactors((r) => (r ? { ...r, people: [] } : r));
        failed(err);
      });
  };

  const remove = (message: MessageResponse) => {
    setDeleting(null);
    if (context?.message.id === message.id) setContext(null);
    void messageStore.remove(channelId, message.id).catch(failed);
  };

  return {
    sheet,
    open: (target: Target) => {
      buzz();
      setSheet(target);
    },
    close: () => setSheet(null),
    picker,
    openPicker: (target: Target) => {
      setSheet(null);
      setPicker(target);
    },
    openComposerPicker: () => setPicker({}),
    closePicker: () => setPicker(null),
    deleting,
    askDelete: (target: Target) => {
      setSheet(null);
      setDeleting(target);
    },
    cancelDelete: () => setDeleting(null),
    remove,
    reactors,
    showReactors: (message: MessageResponse, emoji: string) =>
      loadReactors(message, emoji),
    pickReactors: (emoji: string) =>
      reactors && loadReactors(reactors.message, emoji),
    closeReactors: () => setReactors(null),
    context,
    reply: (message: MessageResponse) => {
      setSheet(null);
      setContext({ kind: 'reply', message });
      onBegin?.('reply', message);
    },
    edit: (message: MessageResponse) => {
      setSheet(null);
      setContext({ kind: 'edit', message });
      onBegin?.('edit', message);
    },
    endContext: () => setContext(null),
    // S-HOME-04 "Ghim tin nhắn" / "Bỏ ghim" (REQ-MSG-10): the system message tells the rest.
    pin: (message: MessageResponse) => {
      setSheet(null);
      void messageStore.pin(channelId, message.id).catch(failed);
    },
    unpin: (message: MessageResponse) => {
      setSheet(null);
      void messageStore.unpin(channelId, message.id).catch(failed);
    },
    // S-HOME-01 `edit-mode` ✓: errors as for any action (CR-28 #7: needs the network).
    saveEdit: (messageId: string, content: string) =>
      void messageStore.edit(channelId, messageId, content).catch(failed),
    // CR-19 #2: "Sao chép link tin".
    copyLink: (message: MessageResponse) => {
      setSheet(null);
      void Clipboard.setStringAsync(
        messageLinkOf(serverId, channelId, message.id),
      ).then(() => showToast({ icon: Copy, message: t('chat.copied') }));
    },
    copyText: (message: MessageResponse) => {
      setSheet(null);
      void Clipboard.setStringAsync(message.content).then(() =>
        showToast({ icon: Copy, message: t('chat.copied') }),
      );
    },
    recent,
    react,
    toggle,
    failed,
  };
}

export type MessageActions = ReturnType<typeof useMessageActions>;
