import type { OwnedServer } from '@nezfocus/shared';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { deletionDay } from '../../../domain/account/deletion';
import { passwordResetStore } from '../../../domain/account/passwordReset';
import { size, space, useTheme } from '../../../shared/theme';
import { Icon } from '../../../shared/ui/Icon';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { PasswordSheet } from '../../../shared/ui/PasswordSheet';
import { Text } from '../../../shared/ui/Text';
import { ServerIcon } from '../../servers/components/ServerIcon';
import {
  deleteAccount,
  useDeletionPreview,
  type DeleteStep,
} from '../hooks/useAccountDeletion';

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// 07 S-ME-03 `delete-blocked-owner` / `delete-confirm` (AUTH-10 AC1, AC2; edge "chuyển Owner xong ở máy khác").
export function DeleteAccountSheets({
  step,
  onStep,
  onOpenServer,
  onForgot,
}: {
  step: DeleteStep;
  onStep: (step: DeleteStep) => void;
  onOpenServer: (serverId: string) => void; // 08 S-SET-08 of that server
  onForgot: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const preview = useDeletionPreview(step);
  const { refresh } = preview;
  const forgotAt = useRef<number | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const [now] = useState(() => Date.now());

  // Back from S-SET-08 or "Quên mật khẩu?": fresh lists, the sheet again.
  useFocusEffect(
    useCallback(() => {
      void refresh();
      const since = forgotAt.current;
      if (since === null) return;
      forgotAt.current = null;
      setResetDone(passwordResetStore.getState().at > since);
      onStep('confirm');
    }, [refresh, onStep, setResetDone]),
  );

  const data = preview.data;
  const owned = data?.owned_servers ?? [];
  const deletesAt = data ? deletionDay(data.deletes_at, now, zone()).date : '';

  const confirm = async (password: string) => {
    if (
      (await deleteAccount(password, data?.deletes_at ?? null)) === 'blocked'
    ) {
      await refresh();
      onStep('blocked');
    }
  };

  const row = (s: OwnedServer, onPress?: () => void) => (
    <Pressable
      key={s.id}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors['overlay-pressed'] },
      ]}
    >
      <ServerIcon server={s} size={onPress ? 40 : 32} />
      <View style={styles.flex}>
        <Text weight="600" numberOfLines={1}>
          {s.name}
        </Text>
        <Text variant="label" color="text-secondary">
          {onPress
            ? t('me.deleteBlockedRow', { count: s.member_count })
            : t('me.deleteSoloRow')}
        </Text>
      </View>
      {onPress && <Icon as={ChevronRight} size="md" color="text-tertiary" />}
    </Pressable>
  );

  return (
    <>
      <BottomSheet
        visible={step === 'blocked'}
        title={t('me.deleteBlockedTitle', { count: owned.length || 1 })}
        action={
          owned.length || !data
            ? {
                label: t('me.deleteClose'),
                variant: 'secondary',
                onPress: () => onStep(null),
              }
            : {
                label: t('me.deleteContinue'),
                variant: 'danger',
                onPress: () => onStep('confirm'),
              }
        }
        onDismiss={() => onStep(null)}
      >
        <View style={styles.body}>
          <Text color="text-secondary">{t('me.deleteBlockedBody')}</Text>
          {owned.map((s) =>
            row(s, () => {
              onStep(null);
              onOpenServer(s.id);
            }),
          )}
        </View>
      </BottomSheet>
      <PasswordSheet
        visible={step === 'confirm'}
        title={t('me.deleteTitle')}
        body={t('me.deleteBody', { date: deletesAt })}
        icon={{ as: Trash2, color: 'danger' }}
        confirmLabel={t('me.deleteConfirm')}
        resetDone={resetDone}
        onConfirm={confirm}
        onForgot={() => {
          onStep(null);
          forgotAt.current = Date.now();
          onForgot();
        }}
        onDismiss={() => {
          setResetDone(false);
          onStep(null);
        }}
      >
        {!!data?.solo_servers.length && (
          <View style={styles.solo}>
            <Text variant="label" weight="600" color="text-secondary">
              {t('me.deleteSolo')}
            </Text>
            {data.solo_servers.map((s) => row(s))}
            <Text variant="label" color="text-secondary">
              {t('me.deleteInvites')}
            </Text>
          </View>
        )}
      </PasswordSheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  body: { gap: space[2] },
  solo: { gap: space[1] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: size.settingsRow,
  },
});
