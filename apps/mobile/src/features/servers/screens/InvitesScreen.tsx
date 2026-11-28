import { inviteUrl, type ServerInviteList } from '@nezfocus/shared';
import * as Clipboard from 'expo-clipboard';
import { EllipsisVertical, Link, Link2Off } from 'lucide-react-native';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { inviteExpiry, inviteUses } from '../../../domain/servers/serverLists';
import { space, typography, useTheme } from '../../../shared/theme';
import { IconButton } from '../../../shared/ui/Button';
import {
  EmptyState,
  Skeleton,
  SystemBanner,
} from '../../../shared/ui/Feedback';
import { ActionSheet, Dialog } from '../../../shared/ui/Overlay';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { useNow } from '../../study/hooks/useSolo';
import { useServerInvites, useRevokeInvite } from '../hooks/useServerLists';
import { useServerAccess, useServerListLoaded } from '../hooks/useServerAccess';

type Invite = ServerInviteList[number];

// S-SET-04 `invites`, `invite-actions`, `invites-empty`, `revoke-confirm`, `offline`
// (MANAGE_SERVER, Q8). Expired, used up or revoked ones never show (the API leaves them out).
export function InvitesScreen({
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
  const invites = useServerInvites(serverId);
  const revoke = useRevokeInvite(serverId);
  const now = useNow(60_000).getTime();
  const [menu, setMenu] = useState<Invite | null>(null);
  const [confirm, setConfirm] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);

  const lost =
    listLoaded && (!access || !access.settingsRows.includes('invites'));
  const onLost = useEffectEvent(onLostAccess);
  useEffect(() => {
    if (lost) onLost();
  }, [lost]);

  const creator = (i: Invite) =>
    i.creator?.display_name ?? i.creator?.username ?? '';
  const line = (i: Invite) => {
    const u = inviteUses(i);
    const exp = inviteExpiry(i.expires_at, now);
    return [
      u.max
        ? t('servers.invites.usesMax', { uses: u.uses, max: u.max })
        : t('servers.invites.uses', { uses: u.uses }),
      exp
        ? t(
            exp.unit === 'day'
              ? 'servers.invites.expDay'
              : exp.unit === 'hour'
                ? 'servers.invites.expHour'
                : 'servers.invites.expMinute',
            { n: exp.n },
          )
        : t('servers.invites.never'),
    ].join(' · ');
  };
  const doRevoke = async (i: Invite) => {
    setBusy(true);
    try {
      await revoke(i.code);
      setConfirm(null);
      showToast({ message: t('servers.invites.revoked'), icon: Link2Off });
    } catch {
      setConfirm(null);
      showToast({ message: t('servers.moderation.failed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('servers.invites.title')} onBack={onBack} />
      {offline && <SystemBanner kind="offline" />}
      {invites.data?.length === 0 ? (
        <EmptyState
          title={t('servers.invites.empty')}
          body={t('servers.invites.emptyBody')}
        />
      ) : (
        <FlatList
          data={invites.data ?? []}
          keyExtractor={(i) => i.code}
          contentContainerStyle={{ paddingBottom: bottom }}
          ListHeaderComponent={
            <Text variant="label" color="text-secondary" style={styles.intro}>
              {t('servers.invites.intro')}
            </Text>
          }
          // C-14 `loading`: 4 skeleton rows.
          ListEmptyComponent={
            invites.isPending ? (
              <View>
                {Array.from({ length: 4 }, (_, i) => (
                  <View key={i} style={styles.row}>
                    <View style={[styles.flex, styles.skeleton]}>
                      <Skeleton width="40%" height={14} />
                      <Skeleton width="60%" height={12} />
                    </View>
                  </View>
                ))}
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.flex}>
                <View style={styles.top}>
                  <Text variant="mono" numberOfLines={1} style={styles.flex}>
                    {item.code}
                  </Text>
                  {item.creator && (
                    <Text
                      variant="label"
                      color="text-secondary"
                      numberOfLines={1}
                    >
                      {t('servers.invites.by', { name: creator(item) })}
                    </Text>
                  )}
                </View>
                <Text variant="label" color="text-secondary" numberOfLines={1}>
                  {line(item)}
                </Text>
              </View>
              <IconButton
                icon={EllipsisVertical}
                label={t('servers.invites.more', { code: item.code })}
                disabled={offline}
                onPress={() => setMenu(item)}
              />
            </View>
          )}
        />
      )}
      <ActionSheet
        visible={!!menu}
        top={
          menu && (
            <View style={styles.menuHead}>
              <Text variant="mono" style={styles.menuCode}>
                {menu.code}
              </Text>
              <Text variant="label" color="text-secondary">
                {[
                  menu.creator?.username
                    ? t('servers.invites.createdBy', {
                        name: creator(menu),
                        username: menu.creator.username,
                      })
                    : t('servers.invites.createdByName', {
                        name: creator(menu),
                      }),
                  inviteUses(menu).max
                    ? t('servers.invites.usesMax', {
                        uses: menu.uses,
                        max: menu.max_uses,
                      })
                    : t('servers.invites.uses', { uses: menu.uses }),
                ].join(' · ')}
              </Text>
            </View>
          )
        }
        onDismiss={() => setMenu(null)}
        groups={[
          {
            items: [
              {
                label: t('servers.invites.copy'),
                icon: Link,
                onPress: () => {
                  const i = menu!;
                  setMenu(null);
                  void Clipboard.setStringAsync(inviteUrl(i.code)).then(() =>
                    showToast({ message: t('invites.copied'), icon: Link }),
                  );
                },
              },
              {
                label: t('servers.invites.revoke'),
                icon: Link2Off,
                destructive: true,
                onPress: () => {
                  setConfirm(menu);
                  setMenu(null);
                },
              },
            ],
          },
        ]}
      />
      <Dialog
        visible={!!confirm}
        row
        title={t('servers.invites.revokeTitle', { code: confirm?.code ?? '' })}
        body={t('servers.invites.revokeBody')}
        confirm={{
          label: t('servers.invites.revoke'),
          variant: 'danger',
          loading: busy,
          disabled: offline,
          onPress: () => confirm && void doRevoke(confirm),
        }}
        cancel={{
          label: t('servers.invites.cancel'),
          onPress: () => setConfirm(null),
        }}
        onDismiss={() => setConfirm(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  intro: { paddingHorizontal: space[3], paddingVertical: space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingLeft: space[3],
    paddingRight: space[1],
    paddingVertical: space[2],
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  skeleton: { gap: space[2] },
  menuHead: { paddingHorizontal: space[3], gap: space[1] },
  menuCode: {
    fontSize: typography.headline.fontSize,
    lineHeight: typography.headline.lineHeight,
  },
});
