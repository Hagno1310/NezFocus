import type { DeletedServer } from '@nezfocus/shared';
import { ArchiveRestore } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { daysLeft } from '../../../domain/servers/serverLists';
import { space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { ServerIcon } from '../components/ServerIcon';
import {
  lifecycleErrorToast,
  useDeletedServers,
  useServerLifecycle,
} from '../hooks/useServerLifecycle';

// 02 S-HOME-06 `restore-list` (SRV-05 v1.7): restore → back on the rail and opened (`onOpen`).
export function DeletedServersScreen({
  onBack,
  onOpen,
}: {
  onBack: () => void;
  onOpen: (serverId: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const deleted = useDeletedServers();
  const { restore } = useServerLifecycle();
  const [busy, setBusy] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const doRestore = async (s: DeletedServer) => {
    setBusy(s.id);
    try {
      await restore(s.id);
      showToast({
        message: t('servers.restore.done', { server: s.name }),
        icon: ArchiveRestore,
      });
      onOpen(s.id);
    } catch (err) {
      lifecycleErrorToast(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('servers.restore.title')} onBack={onBack} />
      <FlatList
        data={deleted.data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottom }]}
        ListHeaderComponent={
          <FormMessage tone="info" text={t('servers.restore.note')} />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <ServerIcon
              server={{ name: item.name, icon_url: item.icon_url }}
              size={48}
            />
            <View style={styles.flex}>
              <Text variant="headline" numberOfLines={1}>
                {item.name}
              </Text>
              <Text variant="label" color="text-secondary">
                {t('servers.restore.daysLeft', { count: daysLeft(item, now) })}
              </Text>
            </View>
            <Button
              label={t('servers.restore.action')}
              variant="secondary"
              size="S"
              disabled={offline || (busy !== null && busy !== item.id)}
              loading={busy === item.id}
              onPress={() => void doRestore(item)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  list: { paddingHorizontal: space[3], gap: space[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
});
