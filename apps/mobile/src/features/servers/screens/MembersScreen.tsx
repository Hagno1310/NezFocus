import { matchesMember } from '@nezfocus/shared';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { useChatClock } from '../../chat/hooks/useChatClock';
import { size, space, useTheme } from '../../../shared/theme';
import { Skeleton, SystemBanner } from '../../../shared/ui/Feedback';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { Text } from '../../../shared/ui/Text';
import { SearchField } from '../../../shared/ui/TextField';
import { MemberItem } from '../components/MemberItem';
import { useMembers } from '../hooks/useMembers';
import { useServerAccess, useServerListLoaded } from '../hooks/useServerAccess';

// S-SET-03 `list`, `search`, `search-empty`, `offline`. By name, not split by presence, never
// re-sorted while shown (useMembers patches in place).
export function MembersScreen({
  serverId,
  onBack,
  onOpen,
  onLostAccess,
}: {
  serverId: string;
  onBack: () => void;
  onOpen: (userId: string) => void;
  onLostAccess: () => void; // back to S-SET-01
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const access = useServerAccess(serverId);
  const listLoaded = useServerListLoaded();
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const { now, timeZone } = useChatClock();
  const members = useMembers(serverId);
  const [query, setQuery] = useState('');

  // Spec 08 › Hiện theo quyền: the row is gone from S-SET-01, so is the screen.
  const lost =
    listLoaded && (!access || !access.settingsRows.includes('members'));
  const onLost = useEffectEvent(onLostAccess);
  useEffect(() => {
    if (lost) onLost();
  }, [lost]);
  if (!access) return null;

  const all = members.data ?? [];
  const searching = query.trim().length > 0;
  const shown = all.filter((m) => matchesMember(m, query));

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('servers.members.title')} onBack={onBack} />
      {offline && <SystemBanner kind="offline" />}
      <View style={styles.search}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('servers.members.search')}
        />
      </View>
      <FlatList
        data={shown}
        keyExtractor={(m) => m.user.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: bottom }}
        ListHeaderComponent={
          members.data ? (
            <SectionLabel style={styles.group}>
              {searching
                ? t('servers.members.results', { count: shown.length })
                : t('servers.members.count', { count: all.length })}
            </SectionLabel>
          ) : (
            <View style={styles.loading}>
              {Array.from({ length: 8 }, (_, i) => (
                <View key={i} style={styles.skeletonRow}>
                  <Skeleton width={32} height={32} round />
                  <Skeleton width="50%" height={12} />
                </View>
              ))}
            </View>
          )
        }
        ListEmptyComponent={
          searching && members.data ? (
            <Text color="text-secondary" style={styles.empty}>
              {t('servers.members.noMatch', { query: query.trim() })}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <MemberItem
            member={item}
            server={access.server}
            roles={access.roles ?? []}
            now={now}
            timeZone={timeZone}
            variant="username"
            timeout
            onPress={() => onOpen(item.user.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  search: { paddingHorizontal: space[3], paddingBottom: space[2] },
  group: {
    height: size.groupTitle,
    paddingTop: space[2],
    paddingHorizontal: space[3],
  },
  empty: { textAlign: 'center', paddingTop: space[4] },
  loading: { paddingHorizontal: space[3], gap: space[3], paddingTop: space[3] },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
  },
});
