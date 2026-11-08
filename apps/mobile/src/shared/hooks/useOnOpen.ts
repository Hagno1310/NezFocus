import { useState } from 'react';

// Runs `onOpen` during the render where `visible` turns true, so a sheet or dialog starts
// over each time it opens (React's "adjust state when a prop changes", not an effect).
export function useOnOpen(visible: boolean, onOpen: () => void) {
  const [shown, setShown] = useState(false);
  if (visible !== shown) {
    setShown(visible);
    if (visible) onOpen();
  }
}
