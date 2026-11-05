import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  radius,
  size,
  space,
  typography,
  useTheme,
  type ColorToken,
} from '../theme';
import { FormMessage } from './FormMessage';
import { Icon } from './Icon';
import { Text } from './Text';

// C-23. `children` replaces `label` when the sentence holds links (terms block): links are
// separate pressables (<Text onPress>) and do not toggle the box.
export function Checkbox({
  checked,
  onChange,
  label,
  children,
  description,
  error,
  disabled = false,
  locked = false,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  // Always set: it is the screen-reader name even when `children` draws the sentence.
  label: string;
  children?: ReactNode;
  description?: string;
  error?: string | null;
  disabled?: boolean;
  // `checked-locked`: ticked and cannot be cleared; `description` says why.
  locked?: boolean;
}) {
  const { colors } = useTheme();
  const inactive = disabled || locked;
  const on = checked || locked;

  const boxStyle = locked
    ? { backgroundColor: colors['surface-3'], borderColor: colors['surface-3'] }
    : on && !disabled
      ? { backgroundColor: colors.primary, borderColor: colors.primary }
      : {
          backgroundColor: 'transparent',
          borderColor: error
            ? colors.danger
            : disabled
              ? colors.border
              : colors['border-input'],
        };
  const tick: ColorToken = locked
    ? 'text-secondary'
    : disabled
      ? 'text-tertiary'
      : 'on-primary';

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked: on, disabled: inactive }}
        disabled={inactive}
        onPress={() => onChange?.(!checked)}
        style={styles.row}
      >
        <View style={styles.boxSlot}>
          <View style={[styles.box, boxStyle]}>
            {on && <Icon as={Check} size="sm" color={tick} />}
          </View>
        </View>
        <View style={styles.text}>
          {children ?? (
            <Text color={disabled ? 'text-tertiary' : 'text-primary'}>
              {label}
            </Text>
          )}
          {description && (
            <Text variant="label" color="text-tertiary">
              {description}
            </Text>
          )}
        </View>
      </Pressable>
      {/* Board CB error sits under the sentence; outside the Pressable so TalkBack reads it. */}
      {error && (
        <View style={styles.errorIndent}>
          <FormMessage variant="field" tone="error" text={error} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[1] },
  row: {
    minHeight: size.touch,
    flexDirection: 'row',
    gap: space[2] + space[1],
    alignItems: 'flex-start',
  },
  // Keeps the box on the first text line when the sentence wraps.
  boxSlot: {
    height: typography.body.lineHeight,
    justifyContent: 'center',
    marginTop: (size.touch - typography.body.lineHeight) / 2,
  },
  box: {
    width: size.checkbox,
    height: size.checkbox,
    borderRadius: radius.badge,
    borderWidth: size.strokeThick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIndent: { paddingLeft: size.checkbox + space[2] + space[1] },
  text: {
    gap: space[1],
    flex: 1,
    paddingVertical: (size.touch - typography.body.lineHeight) / 2,
  },
});
