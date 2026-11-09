import * as SecureStore from 'expo-secure-store';

// S-HOME-02 `collapsed`: remembered per device, per server.
const key = (serverId: string) => `home.collapsed.${serverId}`;

export const homePrefs = {
  collapsed: async (serverId: string): Promise<string[]> => {
    const raw = await SecureStore.getItemAsync(key(serverId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  },
  setCollapsed: (serverId: string, categoryIds: string[]) =>
    categoryIds.length
      ? SecureStore.setItemAsync(key(serverId), JSON.stringify(categoryIds))
      : SecureStore.deleteItemAsync(key(serverId)),
};
