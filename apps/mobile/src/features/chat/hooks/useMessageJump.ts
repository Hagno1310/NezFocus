import { useEffect, useEffectEvent, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import type { FlatList } from 'react-native';
import { useStore } from 'zustand';
import { messageStore } from '../../../data/messages';
import type { ChatRow } from '../../../domain/messages/chatRows';
import { jumps, requestJump, type Jump } from '../../../domain/messages/jumps';
import { showToast } from '../../../shared/ui/Toast';

// Inverted list: viewPosition 1 is the top of the screen; a link's message sits a third down.
const positionOf = (times: 1 | 2) => (times === 2 ? 2 / 3 : 0.5);
// Past a reply's animated scroll (`short`) and the first draw of rows that were off-screen.
const SETTLE_MS = 350;
const RETRY_MS = 100; // rows drawn after a move by estimate
const FLASH_MS = 1500; // 2 × 400 ms flashes, or 1 s held (reduce motion), and some margin

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

  // The jump being placed. A far row is not measured yet: scrollToIndex reports a failure
  // (synchronously, onScrollFailed), the list moves by estimate and it is tried again, until a
  // call goes through. Only then the 1.5 s of flashes count down (C-10).
  const active = useRef<Jump | null>(null);
  const failed = useRef(false);
  const done = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Looked up in the list's rows at the moment of scrolling: a delayed call must not use an
  // index from before the rows changed (walking back, a cache prune) — out of range throws.
  const place = (jump: Jump, animated: boolean) => {
    const data = list.current?.props.data as
      readonly ChatRow[] | null | undefined;
    const index =
      data?.findIndex(
        (r) =>
          r.kind === 'message' &&
          r.item.kind === 'message' &&
          r.item.message.id === jump.messageId,
      ) ?? -1;
    if (index < 0) return;
    failed.current = false;
    list.current?.scrollToIndex({
      index,
      viewPosition: positionOf(jump.times),
      animated,
    });
    if (failed.current || done.current) return;
    if (jumps.getState()?.key === jump.key)
      jumps.setState({ ...jump, landed: true }, true);
    // Landed. The rows around it were only just measured: one more call, once they are drawn,
    // puts it exactly a third down.
    const settle = setTimeout(() => place(jump, false), SETTLE_MS);
    done.current = setTimeout(() => {
      clearTimeout(settle);
      done.current = null;
      active.current = null;
      // Done, so coming back to the channel does not jump again.
      if (jumps.getState()?.key === jump.key) jumps.setState(null, true);
    }, FLASH_MS);
  };

  const land = useEffectEvent(place);
  const found = targetIndex >= 0;
  useEffect(() => {
    if (!target || !found || active.current?.key === target.key) return;
    active.current = target;
    land(target, target.times === 1);
  }, [target, found]);
  useEffect(
    () => () => {
      if (done.current) clearTimeout(done.current);
    },
    [],
  );

  return {
    target: targetIndex >= 0 ? target : null,
    // FlatList onScrollToIndexFailed: true when it was this jump's (it is retried here).
    onScrollFailed: (info: { index: number; averageItemLength: number }) => {
      const jump = active.current;
      if (!jump) return false;
      failed.current = true;
      list.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: false,
      });
      setTimeout(() => {
        if (active.current === jump) place(jump, false);
      }, RETRY_MS);
      return true;
    },
    jumpTo: (messageId: string) =>
      requestJump({ channelId, messageId, times: 1 }),
  };
}
