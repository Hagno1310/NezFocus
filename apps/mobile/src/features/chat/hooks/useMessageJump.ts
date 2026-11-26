import { useEffect, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import type { FlatList } from 'react-native';
import { useStore } from 'zustand';
import { messageStore } from '../../../data/messages';
import type { ChatRow } from '../../../domain/messages/chatRows';
import { jumps, requestJump } from '../../../domain/messages/jumps';
import { showToast } from '../../../shared/ui/Toast';

// C-10 `highlight`: a reply jump flashes once; a link / push (CR-19 #2) twice, the message a
// third from the top. The target lives in `jumps`, so a link opened elsewhere lands here too.
export function useMessageJump(
  channelId: string,
  rows: readonly ChatRow[],
  list: RefObject<FlatList<ChatRow> | null>,
  loading: boolean,
) {
  const { t } = useTranslation();
  const target = useStore(jumps, (j) =>
    j?.channelId === channelId ? j : null,
  );
  const targetIndex = target
    ? rows.findIndex(
        (r) =>
          r.kind === 'message' &&
          r.item.kind === 'message' &&
          r.item.message.id === target.messageId,
      )
    : -1;

  // Not loaded yet: the cache walks back to it. Gone (AC9) → Toast; too far back → stay quiet.
  const walked = useRef<number | null>(null);
  useEffect(() => {
    if (!target || loading || targetIndex >= 0) return;
    if (walked.current === target.key) return;
    walked.current = target.key;
    void messageStore
      .reveal(channelId, target.messageId)
      .then((result) => {
        if (result === 'found') return;
        jumps.setState(null, true);
        if (result === 'missing')
          showToast({ message: t('chat.messageDeleted') });
      })
      .catch(() => jumps.setState(null, true));
  }, [target, loading, targetIndex, channelId, t]);

  const scrolled = useRef<number | null>(null);
  useEffect(() => {
    if (!target || targetIndex < 0 || scrolled.current === target.key) return;
    scrolled.current = target.key;
    // Inverted list: viewPosition 1 is the top of the screen.
    list.current?.scrollToIndex({
      index: targetIndex,
      viewPosition: target.times === 2 ? 2 / 3 : 0.5,
      animated: target.times === 1,
    });
    // After the flashes (2 × 400 ms, or 1 s held): done, so coming back does not jump again.
    const done = setTimeout(() => {
      if (jumps.getState()?.key === target.key) jumps.setState(null, true);
    }, 1500);
    return () => clearTimeout(done);
  }, [target, targetIndex, list]);

  return {
    target: targetIndex >= 0 ? target : null,
    targetIndex,
    jumpTo: (messageId: string) =>
      requestJump({ channelId, messageId, times: 1 }),
  };
}
