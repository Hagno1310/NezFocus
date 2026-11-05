import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { size, space, useTheme } from '../theme';
import { IconButton } from './Button';
import { Text } from './Text';

// C-22: `onBack` omitted = the `no-back` variant (root of a stack).
export function ScreenHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.bg,
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
    height: size.header,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: space[1],
    gap: space[1],
  },
  title: { flex: 1 },
});
