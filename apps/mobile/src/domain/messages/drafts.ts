import { createStore } from 'zustand/vanilla';

// C-11 / 7.3.2: kept per channel until the app exits, so memory only.
export function createDrafts() {
  const state = createStore<Record<string, string>>(() => ({}));
  const drop = (channelId: string) =>
    state.setState((s) => {
      const { [channelId]: _gone, ...rest } = s;
      return rest;
    }, true);
  return {
    state,
    set(channelId: string, text: string) {
      if (text === '') drop(channelId);
      else state.setState({ [channelId]: text });
    },
    // Edge case `channel-removed`: the old channel's draft goes.
    drop,
    reset: () => state.setState({}, true),
  };
}

export const drafts = createDrafts();
