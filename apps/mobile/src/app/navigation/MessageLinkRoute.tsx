import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NezfocusLink } from '../../domain/messages/links';
import { openMessageLink } from '../../features/chat/openMessageLink';
import { space, useTheme } from '../../shared/theme';
import { Button, IconButton } from '../../shared/ui/Button';
import { Icon } from '../../shared/ui/Icon';
import { Text } from '../../shared/ui/Text';
import type { RootStackParamList } from './RootNavigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'ChannelLink' | 'DmLink'
>;

// SRS 7.3.5 App Link /channels/… and /dm/… (CR-19 #2): straight to the channel or DM on the Home
// tab; a server I am not in is 10 S-MOD-01 `members-only`; AC8 stays where it was with a Toast.
export function MessageLinkRoute({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const [membersOnly, setMembersOnly] = useState(false);
  const params = route.params;
  const link: NezfocusLink =
    'serverId' in params
      ? { kind: 'channel', ...params }
      : { kind: 'dm', ...params };
  const key = JSON.stringify(link);

  useEffect(() => {
    let live = true;
    const leave = () =>
      navigation.canGoBack() ? navigation.goBack() : navigation.replace('Main');
    void openMessageLink(JSON.parse(key) as NezfocusLink, {
      fromOutside: true,
    }).then((result) => {
      if (!live) return;
      if (result === 'not-member') return setMembersOnly(true);
      if (result === 'failed') return leave();
      navigation.popTo('Main', {
        screen: 'Home',
        params: { screen: 'HomeRoot' },
      });
    });
    return () => {
      live = false;
    };
  }, [key, navigation]);

  const close = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.replace('Main');
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.bg, paddingTop: top, paddingBottom: bottom },
      ]}
    >
      {membersOnly && (
        <>
          <IconButton icon={X} label={t('chat.close')} onPress={close} />
          <View style={styles.middle}>
            <Icon as={Lock} size="hero" color="text-tertiary" />
            <Text variant="title-1" style={styles.centerText}>
              {t('chat.membersOnlyTitle')}
            </Text>
            <Text color="text-secondary" style={styles.centerText}>
              {t('chat.membersOnlyBody')}
            </Text>
          </View>
          <Button
            variant="secondary"
            size="L"
            fullWidth
            label={t('chat.close')}
            onPress={close}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space[3] },
  middle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[3],
  },
  centerText: { textAlign: 'center' },
});
