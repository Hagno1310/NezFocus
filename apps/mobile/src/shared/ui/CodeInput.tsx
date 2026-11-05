import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { radius, size, space, useTheme } from '../theme';
import { CODE_LENGTH, nextCode } from './logic';
import { Text } from './Text';

// Digit size is capped so "8" still fits the 48-wide cell at 200% (C-24: cells stay on one row).
const DIGIT_MAX_SCALE = 1.25;
const LARGE_TEXT = 2;

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
}: {
  value: string;
  onChange: (code: string) => void;
  // Omit on screens that also hold a password field: they submit with their own button.
  onComplete?: (code: string) => void;
  error?: boolean;
  verifying?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const [focused, setFocused] = useState(false);
  const readOnly = verifying || disabled;
  const large = fontScale >= LARGE_TEXT;

  const active =
    focused && !readOnly ? Math.min(value.length, CODE_LENGTH - 1) : -1;

  return (
    <View style={[styles.row, { gap: large ? space[1] : space[2] }]}>
      {Array.from({ length: CODE_LENGTH }, (_, i) => {
        const digit = value[i] ?? '';
        const isActive = i === active && !error;
        const borderWidth = error || isActive ? 2 : 1;
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
        value={value}
        onChangeText={(raw) => {
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
