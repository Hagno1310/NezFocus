import { useMutation } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

// A mutation whose `run` ignores taps while one is in flight. The ref blocks a second tap
// that lands before React re-renders the button as loading (spec 01 › Chỉ ghi luật).
export function useGuardedMutation<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
) {
  const mutation = useMutation({ mutationFn: (args: A) => fn(...args) });
  const running = useRef(false);
  const { mutateAsync } = mutation;
  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      if (running.current) return undefined;
      running.current = true;
      try {
        return await mutateAsync(args);
      } finally {
        running.current = false;
      }
    },
    [mutateAsync],
  );
  return { run, pending: mutation.isPending };
}
