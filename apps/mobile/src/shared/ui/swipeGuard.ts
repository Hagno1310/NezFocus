import { createStore } from 'zustand/vanilla';

// SRS 3.1: no drawer swipe from a horizontal scroller (C-10 code block) while a finger is on it.
export const swipeGuard = createStore(() => ({ held: false }));

export const holdSwipe = (held: boolean) => swipeGuard.setState({ held });
