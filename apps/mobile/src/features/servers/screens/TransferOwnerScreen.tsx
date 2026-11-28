import { ErrorCode, matchesMember, type ServerMember } from '@nezfocus/shared';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Crown } from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { passwordResetStore } from '../../../domain/account/passwordReset';
import { sessionStore } from '../../../domain/session/sessionStore';
import { space, useTheme } from '../../../shared/theme';
import { EmptyState, Skeleton } from '../../../shared/ui/Feedback';
import { PasswordSheet } from '../../../shared/ui/PasswordSheet';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { SearchField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { useChatClock } from '../../chat/hooks/useChatClock';
import { DeleteServerSheet } from '../components/DeleteServerSheet';
import { MemberItem } from '../components/MemberItem';
import { membersKey, useMembers } from '../hooks/useMembers';
import { useServerAccess, useServerListLoaded } from '../hooks/useServerAccess';
import { useServerLifecycle } from '../hooks/useServerLifecycle';

// A pending-deletion account shows no name (AUTH-10 AC5): it cannot be the Owner (A1, v1.6).
const canOwn = (m: ServerMember, meId: string) =>
  m.user.id !== meId &&
  (m.user.username !== null || m.user.display_name !== null);
const nameOf = (m: ServerMember) =>
  m.user.display_name ?? m.user.username ?? '';

// 08 S-SET-08 `transfer-picker`, `transfer-search`, `transfer-alone`, `transfer-confirm`,
// `transferred` (A1–A3). Done → `onDone`: back to S-SET-01, or the leave Dialog (A3).
export function TransferOwnerScreen({
  serverId,
  onBack,
  onDone,
  onForgot,
  onLostAccess,
}: {
  serverId: string;
  onBack: () => void;
  onDone: () => void;
  onForgot: () => void; // S-ME-03 `password-code`; this screen stays under it
  onLostAccess: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const qc = useQueryClient();
  const access = useServerAccess(serverId);
  const listLoaded = useServerListLoaded();
  const meId = sessionStore.getState().user?.id ?? '';
  const { now, timeZone } = useChatClock();
  const members = useMembers(serverId);
  const { transfer } = useServerLifecycle();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<ServerMember | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const forgotAt = useRef<number | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const done = useRef(false);

  // No longer the Owner (done on another device): nothing to do here.
  const lost = listLoaded && (!access || !access.isOwner);
  const onLost = useEffectEvent(onLostAccess);
  useEffect(() => {
    if (lost && !done.current) onLost();
  }, [lost]);

  // Back from "Quên mật khẩu?": the sheet again, `password-reset-done` if a new one was saved.
  useFocusEffect(
    useCallback(() => {
      const since = forgotAt.current;
      if (since === null) return;
      forgotAt.current = null;
      setResetDone(passwordResetStore.getState().at > since);
      setOpen(true);
    }, [setOpen, setResetDone]),
  );
  if (!access) return null;

  const others = (members.data ?? []).filter((m) => canOwn(m, meId));
  const shown = others.filter((m) => matchesMember(m, query));
  const alone = !!members.data && others.length === 0;

  const confirm = async (password: string) => {
    if (!picked) return;
    await transfer(serverId, picked.user.id, password);
    done.current = true;
    setOpen(false);
    showToast({
      message: t('servers.transfer.done', { name: nameOf(picked) }),
      icon: Crown,
    });
    onDone();
  };
  const close = () => {
    setOpen(false);
    setResetDone(false);
    // "Bình không còn trong server": back on a list without them.
    void qc.invalidateQueries({ queryKey: membersKey(serverId) });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('servers.transfer.title')} onBack={onBack} />
      {alone ? (
        <EmptyState
          title={t('servers.transfer.aloneTitle')}
          body={t('servers.transfer.aloneBody')}
          action={{
            label: t('servers.deleteServer.confirm'),
            variant: 'text',
            tone: 'danger',
            onPress: () => setDeleting(true),
          }}
        />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(m) => m.user.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: bottom }}
          ListHeaderComponent={
            <View style={styles.head}>
              <Text color="text-secondary">
                {t('servers.transfer.intro', { server: access.server.name })}
              </Text>
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder={t('servers.transfer.search')}
              />
              {!members.data && (
                <View style={styles.loading}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <View key={i} style={styles.skeletonRow}>
                      <Skeleton width={32} height={32} round />
                      <Skeleton width="50%" height={12} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            members.data && query.trim() ? (
              <Text color="text-secondary" style={styles.empty}>
                {t('servers.transfer.noMatch', { query: query.trim() })}
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
              onPress={() => {
                setPicked(item);
                setResetDone(false);
                setOpen(true);
              }}
            />
          )}
        />
      )}
      {picked && (
        <PasswordSheet
          visible={open}
          title={t('servers.transfer.confirmTitle', { name: nameOf(picked) })}
          body={t('servers.transfer.confirmBody', {
            name: nameOf(picked),
            server: access.server.name,
          })}
          icon={{ as: Crown, color: 'text-secondary' }}
          confirmLabel={t('servers.transfer.confirm')}
          resetDone={resetDone}
          explain={(err) =>
            (err as { code?: number }).code === ErrorCode.NotFound
              ? t('servers.transfer.gone', { name: nameOf(picked) })
              : null
          }
          onConfirm={confirm}
          onForgot={() => {
            setOpen(false);
            forgotAt.current = Date.now();
            onForgot();
          }}
          onDismiss={close}
        />
      )}
      <DeleteServerSheet
        server={access.server}
        visible={deleting}
        onDismiss={() => setDeleting(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: {
    gap: space[3],
    paddingHorizontal: space[3],
    paddingBottom: space[2],
  },
  empty: { textAlign: 'center', paddingTop: space[4] },
  loading: { gap: space[3], paddingTop: space[2] },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
  },
});
