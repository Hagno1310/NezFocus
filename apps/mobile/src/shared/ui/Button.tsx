import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  radius,
  size,
  space,
  touchSlop,
  useTheme,
  type ColorToken,
} from '../theme';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger';
export type ButtonSize = 'L' | 'M' | 'S';

const heights: Record<ButtonSize, number> = {
  L: size.buttonL,
  M: size.buttonM,
  S: size.buttonS,
};

// C-02 › Lỗi trong form: the main button stays pressable; disabled is for real impossibility.
export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconComponent;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size: s = 'M',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const ring = useFocusRing();
  const filled = variant === 'primary' || variant === 'danger';
  const inactive = disabled || loading;

  const fg: ColorToken = disabled
    ? 'text-tertiary'
    : variant === 'primary'
      ? 'on-primary'
      : variant === 'danger'
        ? 'bg'
        : 'primary';
  const bg = disabled
    ? filled
      ? colors['surface-3']
      : 'transparent'
    : variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : 'transparent';
  const height = heights[s];
  const slop = touchSlop(height);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={{ top: slop, bottom: slop }}
      {...ring.handlers}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          backgroundColor: pressed && !filled ? colors['surface-2'] : bg,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        variant === 'secondary' && {
          borderWidth: size.hairline,
          borderColor: disabled ? colors.border : colors['border-input'],
        },
        ring.style,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {/* DESIGN.md › button-primary: pressed darkens the fill (overlay-pressed). */}
          {pressed && filled && (
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.overlay,
                { backgroundColor: colors['overlay-pressed'] },
              ]}
            />
          )}
          {/* Loading keeps the label in layout (invisible) so the width does not change. */}
          <View style={[styles.content, loading && styles.hidden]}>
            {icon && <Icon as={icon} size="base" color={fg} />}
            {/* Board C-01: every variant and size (48 / 44 / 40) is 16/600. */}
            <Text
              variant="body"
              weight="600"
              color={fg}
              numberOfLines={2}
              style={styles.label}
            >
              {label}
            </Text>
          </View>
          {loading && (
            <ActivityIndicator
              size="small"
              color={colors[fg]}
              style={StyleSheet.absoluteFill}
            />
          )}
        </>
      )}
    </Pressable>
  );
}

// 00-components › Quy ước chung: `focused` (external keyboard, Switch Access) = ring 2 primary, gap 2.
function useFocusRing() {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return {
    handlers: {
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
    style: focused && {
      outlineWidth: size.focusRing,
      outlineOffset: size.focusRing,
      outlineColor: colors.primary,
      outlineStyle: 'solid' as const,
    },
  };
}

export function IconButton({
  icon,
  label,
  disabled = false,
  ...rest
}: Omit<PressableProps, 'children' | 'style'> & {
  icon: IconComponent;
  label: string;
}) {
  const { colors } = useTheme();
  const ring = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...ring.handlers}
      {...rest}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && { backgroundColor: colors['surface-2'] },
        ring.style,
      ]}
    >
      <Icon
        as={icon}
        size="lg"
        color={disabled ? 'text-tertiary' : 'text-secondary'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    paddingHorizontal: space[3],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  overlay: { borderRadius: radius.button },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
  },
  hidden: { opacity: 0 },
  label: { textAlign: 'center' },
  iconButton: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
