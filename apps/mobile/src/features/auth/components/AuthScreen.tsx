import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  size,
  space,
  touchSlop,
  typography,
  useTheme,
} from '../../../shared/theme';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';

// Spec 01 › Quy ước chung: form screens have a ScreenHeader, content anchored at the top
// (the keyboard covers the lower half; errors and banners do not shift what is above them).
export function AuthScreen({
  title,
  onBack,
  banner,
  children,
}: {
  title: string;
  onBack: () => void;
  banner?: ReactNode; // full-width strip under the header (offline, session ended)
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      <ScreenHeader title={title} onBack={onBack} />
      {banner}
      <ScrollView
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottom + space[3] },
        ]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// "Đã có tài khoản? **Đăng nhập**": one target, the link part in primary.
export function InlineLink({
  prefix,
  link,
  onPress,
  disabled = false,
  center = true,
}: {
  prefix?: string;
  link: string;
  onPress: () => void;
  disabled?: boolean;
  center?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${prefix ?? ''}${link}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{
        top: touchSlop(typography.body.lineHeight),
        bottom: touchSlop(typography.body.lineHeight),
      }}
      style={[styles.link, center && styles.center]}
    >
      <Text color="text-secondary">
        {prefix}
        <Text weight="600" color={disabled ? 'text-tertiary' : 'primary'}>
          {link}
        </Text>
      </Text>
    </Pressable>
  );
}

// "──── hoặc ────" between the main button and the mode switch (S-AUTH-04).
export function OrDivider({ label }: { label: string }) {
  const { colors } = useTheme();
  const line = [styles.line, { backgroundColor: colors.border }];
  return (
    <View style={styles.divider} accessible={false}>
      <View style={line} />
      <Text variant="label" color="text-tertiary">
        {label}
      </Text>
      <View style={line} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space[3], gap: space[3] },
  link: { minHeight: typography.body.lineHeight, justifyContent: 'center' },
  center: { alignItems: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  line: { flex: 1, height: size.hairline },
});
