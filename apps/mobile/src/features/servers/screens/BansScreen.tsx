import { memberName, type ServerBan } from '@nezfocus/shared';
import { ChevronRight, ShieldCheck } from 'lucide-react-native';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import {
  BAN_SEARCH_FROM,
  banDetailLine,
  banRowLine,
} from '../../../domain/servers/serverLists';
import { space, useTheme } from '../../../shared/theme';
import {
  EmptyState,
  Skeleton,
  SystemBanner,
} from '../../../shared/ui/Feedback';
import { Icon } from '../../../shared/ui/Icon';
import { BottomSheet, Dialog } from '../../../shared/ui/Overlay';
import { Avatar } from '../../../shared/ui/People';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { SearchField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { useChatClock } from '../../chat/hooks/useChatClock';
import { avatarUri } from '../../me/avatarUri';
import { useBans, useUnban } from '../hooks/useServerLists';
import { useServerAccess, useServerListLoaded } from '../hooks/useServerAccess';

// S-SET-04 `bans`, `bans-empty`, `ban-detail`, `unban-confirm`, `offline`; Edge case P2
// `long-ban-reason` and "Rất nhiều người bị cấm" (pages, the search from 11 people).
export function BansScreen({
  serverId,
  onBack,
  onLostAccess,
}: {
  serverId: string;
  onBack: () => void;
  onLostAccess: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const access = useServerAccess(serverId);
  const listLoaded = useServerListLoaded();
  const offline = useStore(gatewayStore, (s) => s.banner === 'offline');
  const { timeZone } = useChatClock();
  const [query, setQuery] = useState('');
  const bans = useBans(serverId, query.trim());
  const unban = useUnban(serverId);
  const [open, setOpen] = useState<ServerBan | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  // The field stays once shown, so it does not vanish while a search narrows the list.
  const [searchable, setSearchable] = useState(false);

  const lost = listLoaded && (!access || !access.settingsRows.includes('bans'));
  const onLost = useEffectEvent(onLostAccess);
  useEffect(() => {
    if (lost) onLost();
  }, [lost]);

  const rows = bans.data?.pages.flatMap((p) => p.bans) ?? [];
  const many =
    rows.length >= BAN_SEARCH_FROM || !!bans.data?.pages[0]?.next_cursor;
  if (many && !searchable && !query) setSearchable(true);

  // `long-ban-reason`: only the reason is cut; "· 15/10 · bởi An" always shows.
  const tail = (b: ServerBan) => {
    const l = banRowLine(b, timeZone);
    return [l.date, l.by && t('servers.bans.by', { name: l.by })]
      .filter(Boolean)
      .join(' · ');
  };
  const line = (b: ServerBan) =>
    [b.reason, tail(b)].filter(Boolean).join(' · ');
  const detail = (b: ServerBan) => {
    const d = banDetailLine(b, timeZone);
    return d.by && d.username
      ? t('servers.bans.detail', {
          date: d.date,
          name: d.by,
          username: d.username,
        })
      : d.by
        ? t('servers.bans.detailName', { date: d.date, name: d.by })
        : t('servers.bans.detailDate', { date: d.date });
  };
  const doUnban = async (b: ServerBan) => {
    setBusy(true);
    try {
      await unban(b.user.id);
      setConfirm(false);
      setOpen(null);
      showToast({
        message: t('servers.bans.unbanned', { name: memberName(b) }),
        icon: ShieldCheck,
      });
    } catch {
      setConfirm(false);
      showToast({ message: t('servers.moderation.failed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('servers.bans.title')} onBack={onBack} />
      {offline && <SystemBanner kind="offline" />}
      {searchable && (
        <View style={styles.search}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('servers.bans.search')}
            accessibilityLabel={t('servers.bans.search')}
          />
        </View>
      )}
      {bans.data && rows.length === 0 && !query ? (
        <EmptyState title={t('servers.bans.empty')} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(b) => b.user.id}
          contentContainerStyle={{ paddingBottom: bottom }}
          onEndReached={() => {
            if (bans.hasNextPage && !bans.isFetchingNextPage)
              void bans.fetchNextPage();
          }}
          ListEmptyComponent={
            bans.isPending ? (
              <View>
                {Array.from({ length: 4 }, (_, i) => (
                  <View key={i} style={styles.row}>
                    <Skeleton width={40} height={40} round />
                    <View style={[styles.flex, styles.skeleton]}>
                      <Skeleton width="30%" height={14} />
                      <Skeleton width="70%" height={12} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text color="text-secondary" style={styles.noMatch}>
                {t('servers.bans.noMatch', { query: query.trim() })}
              </Text>
            )
          }
          ListFooterComponent={
            bans.isFetchingNextPage ? (
              <View>
                {[0, 1].map((i) => (
                  <View key={i} style={styles.row}>
                    <Skeleton width={40} height={40} round />
                    <Skeleton width="60%" height={12} />
                  </View>
                ))}
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${memberName(item)}, ${line(item)}`}
              onPress={() => setOpen(item)}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors['overlay-pressed'] },
              ]}
            >
              <Avatar
                name={memberName(item)}
                uri={avatarUri(item.user.avatar, '128')}
                size={40}
              />
              <View style={styles.flex}>
                <Text weight="600" numberOfLines={1}>
                  {memberName(item)}
                </Text>
                <View style={styles.line}>
                  {item.reason && (
                    <Text
                      variant="label"
                      color="text-secondary"
                      numberOfLines={1}
                      style={styles.shrink}
                    >
                      {`${item.reason} · `}
                    </Text>
                  )}
                  <Text variant="label" color="text-secondary">
                    {tail(item)}
                  </Text>
                </View>
              </View>
              <Icon as={ChevronRight} size="md" color="text-tertiary" />
            </Pressable>
          )}
        />
      )}
      <BottomSheet
        visible={!!open && !confirm}
        onDismiss={() => setOpen(null)}
        action={{
          label: t('servers.bans.unban'),
          variant: 'secondary',
          disabled: offline,
          onPress: () => setConfirm(true),
        }}
      >
        {open && (
          <View style={styles.detail}>
            <View style={styles.head}>
              <Avatar
                name={memberName(open)}
                uri={avatarUri(open.user.avatar, '128')}
                size={56}
              />
              <View style={styles.flex}>
                <Text variant="title-2" numberOfLines={1}>
                  {memberName(open)}
                </Text>
                {open.user.username && (
                  <Text color="text-secondary" numberOfLines={1}>
                    {open.user.username}
                  </Text>
                )}
              </View>
            </View>
            {open.reason && (
              <View style={styles.reasonBlock}>
                <Text variant="label" weight="600" color="text-secondary">
                  {t('servers.bans.reason')}
                </Text>
                {/* `long-ban-reason`: 512 characters fit at 100%; larger text scrolls here. */}
                <ScrollView style={styles.reason}>
                  <Text>{open.reason}</Text>
                </ScrollView>
              </View>
            )}
            <Text variant="label" color="text-tertiary">
              {detail(open)}
            </Text>
          </View>
        )}
      </BottomSheet>
      <Dialog
        visible={!!open && confirm}
        row
        title={t('servers.bans.unbanTitle', {
          name: open ? memberName(open) : '',
        })}
        body={t('servers.bans.unbanBody', {
          name: open ? memberName(open) : '',
        })}
        confirm={{
          label: t('servers.bans.unban'),
          loading: busy,
          disabled: offline,
          onPress: () => open && void doUnban(open),
        }}
        cancel={{
          label: t('servers.bans.cancel'),
          onPress: () => setConfirm(false),
        }}
        onDismiss={() => setConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  search: { paddingHorizontal: space[3], paddingVertical: space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  skeleton: { gap: space[2] },
  line: { flexDirection: 'row' },
  shrink: { flexShrink: 1 },
  noMatch: { textAlign: 'center', padding: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  reason: { flexGrow: 0, flexShrink: 1 },
  // Frame `ban-detail`: head, reason, then the date line, 12 apart; label to reason 4.
  detail: { gap: space[3], paddingBottom: space[2] },
  reasonBlock: { gap: space[1], flexShrink: 1 },
});
