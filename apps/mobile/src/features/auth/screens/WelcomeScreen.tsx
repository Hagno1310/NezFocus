import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fontScale as textScale,
  size,
  space,
  useTheme,
} from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { RING, Ring } from '../../../shared/ui/Focus';
import { Mascot } from '../../../shared/ui/Mascot';
import { Avatar } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';

// Frame S-AUTH-01 · default: six sample people around the ring, clockwise from 12 o'clock.
const PEOPLE = ['Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Khánh'];
const AVATAR = 40;

// S-AUTH-01. The ring is an illustration: no clock, not pressable, one screen-reader element.
export function WelcomeScreen({
  onCreateAccount,
  onSignIn,
  devActions,
}: {
  onCreateAccount: () => void;
  onSignIn: () => void;
  devActions?: React.ReactNode; // dev builds only (UI Gallery, fake sign-in)
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  // large-text: the body scrolls and the buttons are pinned under a border line.
  const large = fontScale >= textScale.large;
  return (
    <View
      style={[styles.screen, { paddingTop: top, backgroundColor: colors.bg }]}
    >
      <ScrollView contentContainerStyle={styles.body}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('auth.welcome.illustration')}
          style={styles.ring}
        >
          <Ring phase="focus" from={0} to={0.7} />
          <Mascot mood="happy" size={size.mascotSummary} />
          {PEOPLE.map((name, i) => {
            const angle = (i / PEOPLE.length) * 2 * Math.PI;
            const r = RING / 2;
            return (
              <View
                key={name}
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.seat,
                  {
                    left: r + r * Math.sin(angle) - AVATAR / 2,
                    top: r - r * Math.cos(angle) - AVATAR / 2,
                  },
                ]}
              >
                <Avatar name={name} size={AVATAR} />
              </View>
            );
          })}
        </View>
        <Text variant="display" accessibilityRole="header">
          {t('auth.welcome.title')}
        </Text>
        <Text color="text-secondary">{t('auth.welcome.body')}</Text>
        {devActions}
      </ScrollView>
      <View
        style={[
          styles.actions,
          { paddingBottom: bottom + space[3] },
          large && {
            borderTopWidth: size.hairline,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Button
          size="L"
          fullWidth
          label={t('auth.welcome.createAccount')}
          onPress={onCreateAccount}
        />
        <Button
          size="L"
          variant="secondary"
          fullWidth
          label={t('auth.welcome.signIn')}
          onPress={onSignIn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: space[3], paddingTop: space[6], gap: space[3] },
  ring: {
    width: RING,
    height: RING,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space[4],
  },
  seat: { position: 'absolute' },
  actions: { padding: space[3], gap: space[2] },
});
