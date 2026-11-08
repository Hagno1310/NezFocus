import Constants from 'expo-constants';
import { CircleArrowUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { sessionStore } from '../../../domain/session/sessionStore';
import { size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Text } from '../../../shared/ui/Text';

const PACKAGE = Constants.expoConfig?.android?.package ?? 'app.nezfocus';

const openStore = () =>
  Linking.openURL(`market://details?id=${PACKAGE}`).catch(() =>
    Linking.openURL(`https://play.google.com/store/apps/details?id=${PACKAGE}`),
  );

// S-AUTH-00 (NFR-MOB-12): replaces every screen after 42601; no back, cannot be closed.
export function UpdateRequiredScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const minVersion = useStore(sessionStore, (s) => s.minVersion);
  // update-mid-signup: the account waits in S-ONB-01 until the update.
  const midSignup = useStore(sessionStore, (s) => s.status === 'incomplete');
  const current = Constants.expoConfig?.version ?? '0.0.0';
  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: top,
          paddingBottom: bottom + space[3],
          backgroundColor: colors.bg,
        },
      ]}
    >
      <View style={styles.block}>
        <CircleArrowUp size={size.anchorIcon} color={colors.primary} />
        <Text
          variant="title-1"
          accessibilityRole="header"
          style={styles.center}
        >
          {t('auth.update.title')}
        </Text>
        <Text color="text-secondary" style={styles.center}>
          {minVersion
            ? t('auth.update.body', { current, min: minVersion })
            : t('auth.update.bodyNoMin', { current })}
        </Text>
        {midSignup && (
          <Text variant="label" color="text-secondary" style={styles.center}>
            {t('auth.update.midSignup')}
          </Text>
        )}
      </View>
      <Button
        size="L"
        fullWidth
        label={t('auth.update.action')}
        onPress={() => void openStore()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space[3] },
  block: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
  },
  center: { textAlign: 'center' },
});
