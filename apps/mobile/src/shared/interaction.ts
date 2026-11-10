// REQ-AUTH-05 AC1: what counts as the user doing something (a touch or a keystroke), for the
// 10-minute idle timer. UI reports here; presence listens, so shared/ui never reaches into data.
const listeners = new Set<() => void>();

export const onInteraction = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const interacted = () => {
  for (const listener of listeners) listener();
};
