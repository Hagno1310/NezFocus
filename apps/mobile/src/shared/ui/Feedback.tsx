import { BellOff, MicOff, WifiOff } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  motion,
  radius,
  size,
  space,
  touchSlop,
  typography,
  useTheme,
} from '../theme';
import { Button, type ButtonProps } from './Button';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';

// C-14 Banner: neutral full-bleed strip under the header; usable inside Study Room.
export function Banner({
  icon,
  text,
  action,
}: {
  icon: IconComponent | 'spinner';
  text: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: colors['surface-2'] }]}
    >
      {icon === 'spinner' ? (
        <ActivityIndicator size="small" color={colors['text-secondary']} />
      ) : (
        <Icon as={icon} size="sm" color="text-secondary" />
      )}
      <Text variant="label" style={styles.flex}>
        {text}
      </Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          accessibilityLabel={action.label}
          hitSlop={touchSlop(typography.label.lineHeight)}
        >
          <Text variant="label" weight="600" color="primary">
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export type SystemBannerKind =
  'offline' | 'reconnecting' | 'mic-denied' | 'push-denied';

// S-MOD-04 catalog. Deciding when to show it belongs to the Gateway ticket (P0-5.3).
export function SystemBanner({
  kind,
  onOpenSettings,
}: {
  kind: SystemBannerKind;
  onOpenSettings?: () => void;
}) {
  const { t } = useTranslation();
  const settings = onOpenSettings && {
    label: t('ui.banner.openSettings'),
    onPress: onOpenSettings,
  };
  switch (kind) {
    case 'offline':
      return <Banner icon={WifiOff} text={t('ui.banner.offline')} />;
    case 'reconnecting':
      return <Banner icon="spinner" text={t('ui.banner.reconnecting')} />;
    case 'mic-denied':
      return (
        <Banner
          icon={MicOff}
          text={t('ui.banner.micDenied')}
          action={settings}
        />
      );
    case 'push-denied':
      return (
        <Banner
          icon={BellOff}
          text={t('ui.banner.pushDenied')}
          action={settings}
        />
      );
  }
}

// C-14 EmptyState: one centered block. `inline` drops the illustration.
export function EmptyState({
  title,
  body,
  action,
  illustration,
}: {
  title: string;
  body?: string;
  action?: ButtonProps;
  illustration?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      {illustration}
      <Text variant="title-2" style={styles.centerText}>
        {title}
      </Text>
      {body && (
        <Text
          color="text-secondary"
          numberOfLines={2}
          style={styles.centerText}
        >
          {body}
        </Text>
      )}
      {action && <Button {...action} />}
    </View>
  );
}

// C-14 Skeleton: the shape of the real content, gentle 1.2 s pulse, still when Reduce motion is on.
export function Skeleton({
  width,
  height,
  round = false,
}: {
  width: DimensionValue;
  height: number;
  round?: boolean;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(
      reduced
        ? 1
        : withRepeat(withTiming(0.5, { duration: motion.long / 2 }), -1, true),
    );
  }, [opacity, reduced]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          backgroundColor: colors['surface-2'],
          borderRadius: round ? radius.full : radius.badge,
        },
        pulse,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    minHeight: size.banner,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2] + space[1],
    paddingVertical: space[4],
    paddingHorizontal: space[3],
  },
  centerText: { textAlign: 'center' },
});
