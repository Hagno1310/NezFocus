import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { size, space, useTheme } from '../theme';
import { IconButton } from './Button';
import { Text } from './Text';

// C-22: `onBack` omitted = the `no-back` variant (root of a stack).
// The header sits at the top of its screen, so it takes the status bar inset itself: a screen
// that forgot `paddingTop: top` put Back and the title under the status bar. Only a header
// that is not at the top of the screen (UI gallery) passes `topInset={false}`.
export function ScreenHeader({
  title,
  onBack,
  action,
  transparent = false,
  topInset = true,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
  transparent?: boolean; // over a full-bleed phase background (S-STUDY-02)
  topInset?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const inset = topInset ? top : 0;
  return (
    <View
      style={[
        styles.bar,
        {
          height: size.header + inset,
          paddingTop: inset,
          backgroundColor: transparent ? 'transparent' : colors.bg,
          paddingLeft: onBack ? space[1] : space[3],
        },
      ]}
    >
      {onBack && (
        <IconButton icon={ChevronLeft} label={t('ui.back')} onPress={onBack} />
      )}
      {/* C-22: at 200% the title stays one line; the full name goes through accessibilityLabel. */}
      <Text
        variant="headline"
        accessibilityRole="header"
        accessibilityLabel={title}
        numberOfLines={1}
        style={styles.title}
      >
        {title}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: space[1],
    gap: space[1],
  },
  title: { flex: 1 },
});
