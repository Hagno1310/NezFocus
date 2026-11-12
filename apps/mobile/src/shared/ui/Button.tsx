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
  // C-01 `loading` exception: the header "Lưu" shows this text (`text-tertiary`) instead of
  // the spinner (frame 07 S-ME-01 `uploading`).
  loadingLabel?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  // Label colour of `secondary` / `text`: `danger` for a destructive step that still asks
  // first (S-ME-03 "Đăng xuất" on a session row); `neutral` = `text-primary` ("Hủy" on crop).
  tone?: 'danger' | 'neutral';
  // Cap on the label's text scale, for buttons pinned to the bottom (spec 01 large-text: ×1.3).
  labelMaxScale?: number;
};

export function Button({
  label,
  variant = 'primary',
  size: s = 'M',
  icon,
  loading = false,
  loadingLabel,
  disabled = false,
  fullWidth = false,
  tone,
  style,
  labelMaxScale,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const ring = useFocusRing();
  const filled = variant === 'primary' || variant === 'danger';
  const inactive = disabled || loading;
  const textLoading = loading && loadingLabel !== undefined;
  const spinner = loading && !textLoading;

  const fg: ColorToken =
    disabled || textLoading
      ? 'text-tertiary'
      : variant === 'primary'
        ? 'on-primary'
        : variant === 'danger'
          ? 'bg'
          : tone === 'danger'
            ? 'danger'
            : tone === 'neutral'
              ? 'text-primary'
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
      accessibilityLabel={textLoading ? loadingLabel : label}
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
          {/* Loading keeps the label in layout (invisible) so the width does not change.
              collapsable={false}: without opacity this View is layout-only, so Fabric would
              flatten it and move the label to the Pressable when loading ends. That often
              happens while the screen is closing (create → popTo), and react-native-screens
              keeps a closing screen's views attached for the exit animation, so the move
              crashes: "addViewAt … The specified child already has a parent". */}
          <View
            collapsable={false}
            style={[styles.content, spinner && styles.hidden]}
          >
            {icon && <Icon as={icon} size="base" color={fg} />}
            {/* Board C-01: every variant and size (48 / 44 / 40) is 16/600. */}
            <Text
              variant="body"
              weight="600"
              color={fg}
              numberOfLines={2}
              maxFontSizeMultiplier={labelMaxScale}
              style={styles.label}
            >
              {textLoading ? loadingLabel : label}
            </Text>
          </View>
          {/* Gotcha: absoluteFill on ActivityIndicator itself shrinks it to a dot on Android. */}
          {spinner && (
            <View style={[StyleSheet.absoluteFill, styles.center]}>
              <ActivityIndicator size="small" color={colors[fg]} />
            </View>
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
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { textAlign: 'center' },
  iconButton: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
