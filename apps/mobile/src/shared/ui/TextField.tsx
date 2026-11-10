import { Eye, EyeOff, Search, X } from 'lucide-react-native';
import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { radius, size, space, touchSlop, typography, useTheme } from '../theme';
import { IconButton } from './Button';
import { FormMessage } from './FormMessage';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';
import { interacted } from '../interaction';

const MULTILINE_MAX_LINES = 5;

type BaseProps = Omit<TextInputProps, 'style' | 'editable'> & {
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

export type TextFieldProps = BaseProps & {
  label: string;
  icon?: IconComponent;
  error?: string | null;
  helper?: string;
  counterMax?: number;
  disabled?: boolean;
  readonly?: boolean;
  password?: boolean;
  trailing?: ReactNode; // status icon at the end of the field (S-ONB-01 username ✓)
};

// C-02: the label sits above the field, never floating inside (floating labels clip Vietnamese marks).
export function TextField({
  label,
  icon,
  error,
  helper,
  counterMax,
  disabled = false,
  readonly = false,
  password = false,
  trailing,
  multiline,
  value,
  onFocus,
  onBlur,
  ref,
  ...rest
}: TextFieldProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const editable = !disabled && !readonly;

  const borderWidth = readonly
    ? 0
    : focused || error
      ? size.strokeThick
      : size.hairline;
  const borderColor = error
    ? colors.danger
    : focused
      ? colors.primary
      : colors['border-input'];
  // Keep the text still when the border thickens from 1 to 2.
  const inset = space[3] - borderWidth;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text
          variant="label"
          weight="600"
          color="text-secondary"
          style={styles.flex}
        >
          {label}
        </Text>
        {counterMax !== undefined && (
          <Text variant="label" color="text-tertiary">
            {(value ?? '').length}/{counterMax}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.field,
          {
            borderWidth,
            borderColor,
            paddingHorizontal: inset,
            backgroundColor:
              disabled || readonly ? colors['surface-2'] : colors['surface-1'],
          },
          multiline && styles.multiline,
        ]}
      >
        {icon && <Icon as={icon} size="base" color="text-tertiary" />}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          // Gotcha: on Android accessibilityState.disabled also sets the view's enabled flag,
          // so `disabled: false` on a readonly field re-enabled it and the keyboard typed in.
          accessibilityState={{ disabled: !editable }}
          editable={editable}
          value={value}
          multiline={multiline}
          maxLength={counterMax}
          secureTextEntry={password && !revealed}
          placeholderTextColor={colors['text-tertiary']}
          cursorColor={colors.primary}
          selectionColor={colors.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
          // Typing counts as activity for presence (AUTH-05 AC1), touches alone miss it.
          onChangeText={(text) => {
            interacted();
            rest.onChangeText?.(text);
          }}
          style={[
            styles.input,
            {
              color: disabled
                ? colors['text-tertiary']
                : colors['text-primary'],
            },
            multiline && {
              maxHeight:
                typography.body.lineHeight * MULTILINE_MAX_LINES + space[3],
              paddingVertical: space[2],
            },
          ]}
        />
        {trailing}
        {password && (
          <IconButton
            icon={revealed ? EyeOff : Eye}
            label={t(revealed ? 'ui.hidePassword' : 'ui.showPassword')}
            onPress={() => setRevealed((r) => !r)}
            disabled={disabled}
          />
        )}
      </View>
      {error ? (
        <FormMessage variant="field" tone="error" text={error} />
      ) : helper ? (
        <FormMessage variant="field" tone="info" text={helper} />
      ) : null}
    </View>
  );
}

export function SearchField({ value, onChangeText, ref, ...rest }: BaseProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.field,
        styles.search,
        { backgroundColor: colors['surface-2'] },
      ]}
    >
      <Icon as={Search} size="base" color="text-tertiary" />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(text) => {
          interacted();
          onChangeText?.(text);
        }}
        accessibilityRole="search"
        placeholderTextColor={colors['text-tertiary']}
        cursorColor={colors.primary}
        selectionColor={colors.primary}
        returnKeyType="search"
        {...rest}
        style={[
          styles.input,
          styles.searchInput,
          { color: colors['text-primary'] },
        ]}
      />
      {/* An 18 icon in the 44 field; slop keeps the 48 touch target without growing the field. */}
      {!!value && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ui.clear')}
          hitSlop={touchSlop(size.icon.base)}
          onPress={() => onChangeText?.('')}
          style={styles.clear}
        >
          <Icon as={X} size="base" color="text-secondary" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: size.iconGap },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  flex: { flex: 1 },
  field: {
    minHeight: size.field,
    borderRadius: radius.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  multiline: { alignItems: 'flex-start' },
  // Board SearchField: 44 high, radius 12, padding 12.
  search: {
    minHeight: size.buttonM,
    borderRadius: radius.button,
    paddingHorizontal: space[2] + space[1],
  },
  clear: { alignItems: 'center', justifyContent: 'center' },
  searchInput: { minHeight: size.buttonM },
  input: {
    ...typography.body,
    flex: 1,
    // Android TextInput adds its own side padding; the field already insets 16.
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: size.field - size.hairline * 2,
    textAlignVertical: 'center',
  },
});
