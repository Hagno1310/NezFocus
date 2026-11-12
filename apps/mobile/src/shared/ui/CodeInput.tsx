import { useState, type ComponentRef, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import {
  codeDigit,
  fontScale as textScale,
  radius,
  size,
  space,
  useTheme,
} from '../theme';
import { CODE_LENGTH, nextCode } from './logic';
import { Text } from './Text';
import { interacted } from '../interaction';

// Digit (26) is capped so "8" still fits the 48-wide cell at 200% (C-24: cells stay on one row).
const DIGIT_MAX_SCALE = 1.5;

// C-24. One hidden input takes the whole string (OS one-time-code suggestion, paste);
// the six cells only display it. The parent clears `error` in `onChange`.
export function CodeInput({
  value,
  onChange,
  onComplete,
  error = false,
  verifying = false,
  disabled = false,
  autoFocus = true,
  ref,
}: {
  value: string;
  onChange: (code: string) => void;
  // Omit on screens that also hold a password field: they submit with their own button.
  onComplete?: (code: string) => void;
  error?: boolean;
  verifying?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>; // focus() from a form that checks the code on submit
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [focused, setFocused] = useState(false);
  const readOnly = verifying || disabled;
  const large = fontScale >= textScale.large;

  const active =
    focused && !readOnly ? Math.min(value.length, CODE_LENGTH - 1) : -1;

  return (
    <View style={[styles.row, { gap: large ? space[1] : space[2] }]}>
      {Array.from({ length: CODE_LENGTH }, (_, i) => {
        const digit = value[i] ?? '';
        const isActive = i === active && !error;
        const borderWidth =
          error || isActive ? size.strokeThick : size.hairline;
        return (
          <View
            key={i}
            style={[
              styles.cell,
              {
                height: large
                  ? size.codeCell.largeHeight
                  : size.codeCell.height,
                borderWidth,
                borderColor: error
                  ? colors.danger
                  : isActive
                    ? colors.primary
                    : colors['border-input'],
                backgroundColor: readOnly
                  ? colors['surface-2']
                  : colors['surface-1'],
              },
            ]}
          >
            <Text
              variant="stat"
              style={codeDigit}
              allowFontScaling
              maxFontSizeMultiplier={DIGIT_MAX_SCALE}
              color={disabled ? 'text-tertiary' : 'text-primary'}
            >
              {digit}
            </Text>
            {isActive && !digit && (
              <View
                style={[styles.caret, { backgroundColor: colors.primary }]}
              />
            )}
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(raw) => {
          interacted();
          const code = nextCode(value, raw, error);
          onChange(code);
          if (code.length === CODE_LENGTH) onComplete?.(code);
        }}
        editable={!readOnly}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        accessibilityLabel={t('ui.codeInput')}
        accessibilityValue={{ text: value.split('').join(' ') }}
        accessibilityState={{ disabled: readOnly, busy: verifying }}
        caretHidden
        contextMenuHidden={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center' },
  cell: {
    width: size.codeCell.width,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caret: { position: 'absolute', width: size.focusRing, height: space[4] },
  // Covers the cells so a tap focuses it and long-press offers Paste; invisible but hit-testable.
  hidden: { ...StyleSheet.absoluteFill, opacity: 0.01, color: 'transparent' },
});
