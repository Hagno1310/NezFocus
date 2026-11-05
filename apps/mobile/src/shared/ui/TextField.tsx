import { Eye, EyeOff, Info, OctagonX, Search, X } from 'lucide-react-native';
import { useState, type ComponentRef, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { radius, size, space, typography, useTheme } from '../theme';
import { IconButton } from './Button';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

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

  const borderWidth = readonly ? 0 : focused || error ? 2 : 1;
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
        <Text variant="label" color="text-secondary" style={styles.flex}>
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
        {icon && <Icon as={icon} size="md" color="text-tertiary" />}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
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
        <FieldNote tone="error" text={error} />
      ) : helper ? (
        <FieldNote tone="info" text={helper} />
      ) : null}
    </View>
  );
}

function FieldNote({ tone, text }: { tone: 'error' | 'info'; text: string }) {
  const error = tone === 'error';
  return (
    <View
      style={styles.note}
      accessibilityLiveRegion={error ? 'polite' : 'none'}
    >
      <Icon
        as={error ? OctagonX : Info}
        size="sm"
        color={error ? 'danger' : 'text-secondary'}
      />
      <Text
        variant="label"
        color={error ? 'danger' : 'text-secondary'}
        style={styles.flex}
      >
        {text}
      </Text>
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
      <Icon as={Search} size="md" color="text-tertiary" />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        accessibilityRole="search"
        placeholderTextColor={colors['text-tertiary']}
        cursorColor={colors.primary}
        selectionColor={colors.primary}
        returnKeyType="search"
        {...rest}
        style={[styles.input, { color: colors['text-primary'] }]}
      />
      {!!value && (
        <IconButton
          icon={X}
          label={t('ui.clear')}
          onPress={() => onChangeText?.('')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[1] },
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
  search: { paddingLeft: space[3] },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: 0,
    minHeight: size.field - 2,
    textAlignVertical: 'center',
  },
  note: {
    flexDirection: 'row',
    gap: space[1],
    alignItems: 'flex-start',
    paddingTop: 2,
  },
});
