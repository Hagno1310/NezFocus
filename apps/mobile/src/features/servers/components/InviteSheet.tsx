import {
  INVITE_MAX_AGES,
  INVITE_MAX_USES,
  type InviteMaxAge,
  type InviteMaxUses,
} from '@nezfocus/shared';
import { Check, CircleAlert, WifiOff } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import {
  closeInviteSheet,
  inviteSheetStore,
} from '../../../domain/invites/inviteSheetStore';
import { displayLink } from '../../../domain/invites/inviteSheet';
import { radius, space, useTheme } from '../../../shared/theme';
import { Skeleton } from '../../../shared/ui/Feedback';
import { ChipGroup, FilterChip } from '../../../shared/ui/FilterChip';
import { Icon } from '../../../shared/ui/Icon';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { Text } from '../../../shared/ui/Text';
import { ToastCard } from '../../../shared/ui/Toast';
import { useInviteSheet } from '../hooks/useInviteSheet';

function TextAction({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={12}
      onPress={onPress}
    >
      <Text
        variant="label"
        weight="600"
        color={disabled ? 'text-tertiary' : danger ? 'danger' : 'primary'}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// S-HOME-07 · Tạo & chia sẻ lời mời (spec 02). Mounted once in the Home tab.
export function InviteSheet() {
  const { serverId, open, opening } = useStore(inviteSheetStore);
  if (!serverId) return null;
  return <InviteSheetBody key={opening} serverId={serverId} visible={open} />;
}

function InviteSheetBody({
  serverId,
  visible,
}: {
  serverId: string;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sheet = useInviteSheet(serverId);
  const { state, settings, draft } = sheet;

  const usesText = (uses: number) =>
    uses ? t('invites.uses', { count: uses }) : t('invites.unlimitedUses');
  const settingsLine = t('invites.settingsLine', {
    age: t(`invites.ages.${settings.max_age}`),
    uses: usesText(settings.max_uses),
  });

  if (state === 'edit-settings')
    return (
      <BottomSheet
        visible={visible}
        title={t('invites.settingsTitle')}
        onDismiss={closeInviteSheet}
        action={{
          label: t('invites.newLink'),
          disabled: !sheet.online,
          onPress: () => sheet.newLink(draft),
        }}
      >
        <View style={styles.settings}>
          <Text variant="label" color="text-secondary">
            {t('invites.expiresAfter')}
          </Text>
          <ChipGroup>
            {INVITE_MAX_AGES.map((age: InviteMaxAge) => (
              <FilterChip
                key={age}
                label={t(`invites.ageChips.${age}`)}
                selected={draft.max_age === age}
                onPress={() => sheet.setDraft({ ...draft, max_age: age })}
              />
            ))}
          </ChipGroup>
          <Text variant="label" color="text-secondary">
            {t('invites.useCount')}
          </Text>
          <ChipGroup>
            {INVITE_MAX_USES.map((uses: InviteMaxUses) => (
              <FilterChip
                key={uses}
                label={uses ? String(uses) : t('invites.unlimited')}
                selected={draft.max_uses === uses}
                onPress={() => sheet.setDraft({ ...draft, max_uses: uses })}
              />
            ))}
          </ChipGroup>
          <Text variant="label" color="text-secondary">
            {t('invites.oldLinkNote')}
          </Text>
        </View>
      </BottomSheet>
    );

  const ready = state === 'default' && !!sheet.url;
  const field = (() => {
    if (state === 'loading')
      return (
        <>
          <View style={styles.flex}>
            <Skeleton width="85%" height={12} round />
          </View>
          <TextAction label={t('invites.copy')} disabled onPress={() => {}} />
        </>
      );
    if (state === 'error')
      return (
        <>
          <Icon as={CircleAlert} size="base" color="danger" />
          <Text variant="body-sm" color="danger" style={styles.flex}>
            {t('invites.error')}
          </Text>
          <TextAction label={t('invites.retry')} onPress={sheet.retry} />
        </>
      );
    if (state === 'offline')
      return (
        <>
          <Icon as={WifiOff} size="base" color="text-secondary" />
          <Text variant="body-sm" color="text-secondary" style={styles.flex}>
            {t('invites.offline')}
          </Text>
        </>
      );
    if (state === 'revoked')
      return (
        <Text variant="body-sm" color="text-tertiary" style={styles.flex}>
          {t('invites.revoked')}
        </Text>
      );
    return (
      <>
        {/* Never cut the code: the scheme is already gone, shrink rather than wrap. */}
        <Text
          variant="mono"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.flex}
        >
          {displayLink(sheet.url!)}
        </Text>
        <TextAction label={t('invites.copy')} onPress={sheet.copy} />
      </>
    );
  })();

  return (
    <BottomSheet
      visible={visible}
      title={t('invites.sheetTitle', { server: sheet.serverName })}
      onDismiss={closeInviteSheet}
      above={
        sheet.copied ? (
          <ToastCard toast={{ message: t('invites.copied'), icon: Check }} />
        ) : undefined
      }
      action={
        state === 'revoked'
          ? {
              label: t('invites.newLink'),
              disabled: !sheet.online,
              onPress: () => sheet.newLink(),
            }
          : {
              label: t('invites.share'),
              disabled: !ready,
              onPress: sheet.share,
            }
      }
    >
      <View style={styles.body}>
        <Text color="text-secondary">{t('invites.sheetSubtitle')}</Text>
        <View
          style={[
            styles.field,
            {
              backgroundColor: colors['surface-2'],
            },
          ]}
        >
          {field}
        </View>
        <View style={styles.settingsRow}>
          <Text variant="label" color="text-secondary" style={styles.flex}>
            {settingsLine}
          </Text>
          {(state === 'default' ||
            state === 'error' ||
            state === 'offline') && (
            <TextAction label={t('invites.edit')} onPress={sheet.edit} />
          )}
          {(state === 'default' || state === 'offline') && (
            <>
              <Text variant="label" color="text-tertiary">
                ·
              </Text>
              <TextAction
                label={t('invites.revoke')}
                danger
                disabled={!sheet.online || !sheet.invite || sheet.busy}
                onPress={() => void sheet.revoke()}
              />
            </>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: space[3], paddingBottom: space[2] },
  field: {
    minHeight: 48,
    borderRadius: radius.button,
    paddingHorizontal: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  settings: { gap: space[3], paddingBottom: space[2] },
});
