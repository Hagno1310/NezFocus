import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { size, space, useTheme } from '../theme';
import { Icon, type IconComponent } from './Icon';
import { Badge } from './People';
import { Text } from './Text';
import { useToastAnchor } from './Toast';
import { Tooltip } from './Tooltip';

export type TabBadge = number | 'dot' | undefined;

const PRESSED_SCALE = 0.96;

// C-03. Routes pass `tabBarIcon`-free options; icons and badges come from `tabs` by route name.
export function TabBar({
  state,
  descriptors,
  navigation,
  tabs,
}: BottomTabBarProps & {
  tabs: Record<string, { icon: IconComponent; badge?: TabBadge }>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tip, setTip] = useState<string | null>(null);
  // Only while Main is on top: a stack screen pushed over it has no tab bar under its toasts.
  const onTop = useIsFocused();
  useToastAnchor(onTop ? size.tabBar + insets.bottom : 0);

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          height: size.tabBar + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: colors['surface-1'],
          borderTopColor: colors.border,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key]?.options.title ?? route.name;
        const tab = tabs[route.name];
        const badge = tab?.badge;
        const color = focused ? 'primary' : 'text-tertiary';
        const badgeLabel =
          badge === 'dot'
            ? t('ui.badgeDot')
            : badge
              ? t('ui.badgeCount', { count: badge })
              : undefined;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={badgeLabel ? `${label}, ${badgeLabel}` : label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented)
                navigation.navigate(route.name);
            }}
            onLongPress={() => setTip(route.key)}
            onPressOut={() => setTip(null)}
            style={styles.tab}
          >
            {({ pressed }) => (
              <>
                <View style={pressed && styles.pressed}>
                  {tab && <Icon as={tab.icon} size="xl" color={color} />}
                  {badge !== undefined && (
                    <View
                      style={
                        badge === 'dot' ? styles.dotSpot : styles.badgeSpot
                      }
                    >
                      <Badge count={badge} />
                    </View>
                  )}
                </View>
                {/* C-03: the 11 label never scales; long press shows it full size. */}
                <Text
                  variant="tab"
                  weight={focused ? '600' : '500'}
                  color={color}
                  numberOfLines={1}
                  allowFontScaling={false}
                >
                  {label}
                </Text>
                {tip === route.key && <Tooltip text={label} />}
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: size.hairline },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1] / 2,
  },
  pressed: { transform: [{ scale: PRESSED_SCALE }] },
  badgeSpot: {
    position: 'absolute',
    left: size.icon.xl - space[2],
    top: -space[1],
  },
  dotSpot: { position: 'absolute', right: -space[1] / 2, top: 0 },
});
