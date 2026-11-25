import { UserCheck, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { radius, size, useTheme } from '../../../shared/theme';
import { Icon, UserSent } from '../../../shared/ui/Icon';

export type RelationIconKind = 'friend' | 'sent' | 'add';

// Chốt 25/11/2026 (Discord): the relation as a 44 icon box — S-HOME-10 button row, or on the banner.
// `friend` is a label, `sent` a disabled button (never sent twice), `add` sends the request.
export function RelationIcon({
  kind,
  onAdd,
  busy = false,
  disabled = false,
  onBanner = false,
}: {
  kind: RelationIconKind;
  onAdd?: () => void;
  busy?: boolean;
  disabled?: boolean;
  // Beside ⋯ on the S-HOME-10 banner: a 36 `scrim` circle like ⋯, touch 48.
  onBanner?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const frame = onBanner
    ? [styles.circle, { backgroundColor: colors.scrim }]
    : [styles.box, { borderColor: colors['border-input'] }];
  if (kind === 'add') {
    const inactive = disabled || busy;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('profile.add')}
        accessibilityState={{ disabled: inactive, busy }}
        disabled={inactive}
        hitSlop={onBanner ? (size.touch - BANNER) / 2 : undefined}
        onPress={onAdd}
        style={({ pressed }) => [
          frame,
          pressed && { backgroundColor: colors['surface-2'] },
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Icon
            as={UserPlus}
            size="base"
            color={disabled ? 'text-tertiary' : 'primary'}
          />
        )}
      </Pressable>
    );
  }
  return (
    <View
      accessible
      accessibilityRole={kind === 'sent' ? 'button' : undefined}
      accessibilityLabel={t(
        kind === 'sent' ? 'profile.chips.sent' : 'profile.chips.friend',
      )}
      accessibilityState={kind === 'sent' ? { disabled: true } : undefined}
      style={onBanner ? frame : [styles.box, { borderColor: colors.border }]}
    >
      <Icon
        as={kind === 'sent' ? UserSent : UserCheck}
        size="base"
        color={
          kind === 'sent'
            ? 'text-tertiary'
            : onBanner
              ? 'text-primary'
              : 'text-secondary'
        }
      />
    </View>
  );
}

const BANNER = 36;

const styles = StyleSheet.create({
  circle: {
    width: BANNER,
    height: BANNER,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2, // optical centre, as below
  },
  // Same frame as a secondary Button M, without the label.
  box: {
    width: size.buttonM,
    minHeight: size.buttonM,
    borderWidth: size.hairline,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    // Optical centre: user glyphs carry their weight on the left (person, then a thin mark).
    paddingLeft: 3,
  },
});
