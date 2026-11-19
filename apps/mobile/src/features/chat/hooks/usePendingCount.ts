import { useEffect, useState } from 'react';
import { messageStore } from '../../../data/messages';

// S-ME-02 `logout-confirm`: messages still in the outbox, read when `asking` turns on.
export function usePendingCount(asking: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (asking)
      void messageStore.countPending().then(setCount, () => setCount(0));
  }, [asking]);
  return count;
}
