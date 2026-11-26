import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

// A drawer over the chat (S-HOME-02 / S-HOME-03); HomeDrawers sets it. BottomSheets do not count.
// `viewing`: the full-screen image viewer (S-HOME-11, NOTIF-01) is over it.
export const chatCover = createStore<{ covered: boolean; viewing: boolean }>(
  () => ({ covered: false, viewing: false }),
);

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) =>
      setActive(s === 'active'),
    );
    return () => sub.remove();
  }, []);
  return active;
}

// SRS 7.3.3 "Đã đọc chỉ khi thật sự thấy": app active (a socket kept alive in the background
// does not count) and the chat on top of the selected tab, no drawer over it.
export function useReadTracking() {
  const active = useAppActive();
  const focused = useIsFocused();
  const covered = useStore(chatCover, (s) => s.covered || s.viewing);
  return { active, canAck: active && focused && !covered };
}
