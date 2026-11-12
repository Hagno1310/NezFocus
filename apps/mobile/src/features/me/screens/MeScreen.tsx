import Constants from 'expo-constants';
import {
  Bell,
  ChevronRight,
  LogOut,
  Palette,
  Shield,
  UserRound,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MY_STATUSES, myDot } from '../../../domain/account/status';
import {
  radius,
  size,
  space,
  touchSlop,
  typography,
  useTheme,
} from '../../../shared/theme';
import { Icon } from '../../../shared/ui/Icon';
import { Dialog, BottomSheet } from '../../../shared/ui/Overlay';
import { Avatar, PresenceDot } from '../../../shared/ui/People';
import { RadioRow } from '../../../shared/ui/RadioRow';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { Text } from '../../../shared/ui/Text';
import { useLogOut } from '../../auth/hooks/useAuthActions';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import { useMyStatus } from '../../presence/hooks/usePresence';
import { useStudyStats } from '../../study/hooks/useStudyStats';
import { avatarUri } from '../avatarUri';
import { useMe } from '../hooks/useMe';

const appVersion = Constants.expoConfig?.version ?? '0.0.0';

// S-ME-02: the root of the Cá nhân tab — who I am, my status, the settings groups, log out.
export function MeScreen({
  onOpenProfile,
  onOpenStreak,
  onOpenAccount,
  onOpenPrivacy,
  onOpenNotifications,
  onOpenAppearance,
  devActions,
}: {
  onOpenProfile: () => void;
  onOpenStreak: () => void;
  onOpenAccount: () => void;
  onOpenPrivacy: () => void;
  onOpenNotifications: () => void;
  onOpenAppearance: () => void;
  devActions?: ReactNode; // __DEV__ only (UI Gallery, sample badges…)
}) {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const { colors } = useTheme();
  const online = useOnline();
  const me = useMe().data;
  // REQ-STUDY-03 via P1-B3.1 (#84): today's streak; STREAK_UPDATE keeps it live.
  const streak = useStudyStats('week').data?.current_streak_days;
  const [status, setStatus] = useMyStatus();
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const logOut = useLogOut();

  const name = me?.display_name ?? me?.username ?? '';
  const avatar = avatarUri(me?.avatar, '128');

  return (
    <View style={[styles.screen, { paddingTop: top }]}>
      <Text variant="title-1" accessibilityRole="header" style={styles.title}>
        {t('tabs.me')}
      </Text>
      {/* Spec 07 › Offline: on a tab root the banner sits right under the tab title. */}
      <ConnectionBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${t('me.openProfile')}`}
          onPress={onOpenProfile}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: pressed
                ? colors['surface-2']
                : colors['surface-1'],
            },
          ]}
        >
          <Avatar
            name={name}
            uri={avatar}
            size={56}
            self
            presence={myDot(status)}
            ring="surface-1"
          />
          <View style={styles.cardText}>
            {/* S-ME-EDGE `long-name-card`: one line, cut with "…". */}
            <Text variant="headline" numberOfLines={1}>
              {name}
            </Text>
            {/* `large-text-root`: "an.nguyen ·" / "🔥 6 ngày", the streak never splits. */}
            <View style={styles.subline}>
              {me?.username && (
                <Text variant="label" color="text-secondary">
                  {streak === undefined ? me.username : `${me.username} · `}
                </Text>
              )}
              {streak !== undefined && (
                <Pressable
                  accessibilityRole="button"
                  onPress={onOpenStreak}
                  hitSlop={{
                    top: touchSlop(typography.label.lineHeight),
                    bottom: touchSlop(typography.label.lineHeight),
                  }}
                >
                  <Text variant="label" color="text-secondary">
                    {t('me.streak', { count: streak }).replace(/ /g, ' ')}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          <Icon as={ChevronRight} size="md" color="text-tertiary" />
        </Pressable>

        <SettingsRow
          label={
            status === 'invisible'
              ? t('me.invisibleRow')
              : t(`me.status.${status}`)
          }
          leading={<PresenceDot status={myDot(status)} />}
          disabled={!online}
          onPress={() => setPicking(true)}
        />

        <View>
          <SectionLabel style={styles.section}>{t('me.settings')}</SectionLabel>
          <SettingsRow
            label={t('me.account')}
            icon={UserRound}
            onPress={onOpenAccount}
          />
          <SettingsRow
            label={t('me.privacy')}
            icon={Shield}
            onPress={onOpenPrivacy}
          />
          <SettingsRow
            label={t('me.notifications')}
            icon={Bell}
            onPress={onOpenNotifications}
          />
          <SettingsRow
            label={t('me.appearance')}
            icon={Palette}
            onPress={onOpenAppearance}
          />
          <SettingsRow
            label={t('me.logout')}
            icon={LogOut}
            danger
            onPress={() => setConfirming(true)}
          />
        </View>
        <Text variant="label" color="text-tertiary" style={styles.version}>
          {t('me.version', { version: appVersion })}
        </Text>
        {devActions}
      </ScrollView>

      <BottomSheet
        visible={picking}
        title={t('me.statusSheet')}
        onDismiss={() => setPicking(false)}
      >
        <View accessibilityRole="radiogroup" style={styles.statusList}>
          {MY_STATUSES.map((s) => (
            <RadioRow
              key={s}
              label={t(`me.status.${s}`)}
              description={s === 'online' ? undefined : t(`me.statusHint.${s}`)}
              leading={<PresenceDot status={myDot(s)} />}
              selected={s === status}
              onPress={() => {
                setStatus(s);
                setPicking(false);
              }}
            />
          ))}
        </View>
      </BottomSheet>

      {/* AUTH-07: "Tin nhắn chưa gửi…" joins the body once the outbox exists (P2-A3.3 #101). */}
      <Dialog
        visible={confirming}
        title={t('me.logoutTitle')}
        confirm={{
          label: t('me.logout'),
          variant: 'danger',
          loading: logOut.pending,
          onPress: () => void logOut.run(),
        }}
        cancel={{ label: t('me.cancel'), onPress: () => setConfirming(false) }}
        onDismiss={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statusList: { gap: space[1] },
  screen: { flex: 1 },
  title: { paddingHorizontal: space[3], paddingVertical: space[2] },
  content: {
    paddingHorizontal: space[3],
    paddingBottom: space[4],
    gap: space[2],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.button,
    minHeight: size.settingsRow,
  },
  cardText: { flex: 1, gap: space[1] / 2 },
  subline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  section: { paddingTop: space[3], paddingBottom: space[1] },
  version: { textAlign: 'center', paddingTop: space[3] },
});
