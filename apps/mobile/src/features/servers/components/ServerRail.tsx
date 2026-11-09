import type { ServerSummary } from '@nezfocus/shared';
import { MessageCircle, Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { railInitials } from '../../../domain/servers/drawer';
import { radius, size, space, useTheme } from '../../../shared/theme';
import { Icon } from '../../../shared/ui/Icon';
import { Badge } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';

// C-26 sizes (board `C-10 · … · Chat`, RailItem).
export const RAIL_WIDTH = 72;
const ITEM = { height: 56, tile: 48 };
const PILL = { width: 4, selected: 40, unread: 8 };
const DIVIDER = { width: 32, height: 2, row: 10 };
const BADGE_RING = 3;

function RailItem({
  label,
  selected = false,
  unread = false,
  mentions = 0,
  dashed = false,
  onPress,
  children,
}: {
  label: string;
  selected?: boolean;
  unread?: boolean;
  mentions?: number;
  dashed?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const pill = selected ? PILL.selected : unread ? PILL.unread : 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.item}
    >
      {({ pressed }) => (
        <>
          {pill > 0 && (
            <View
              style={[
                styles.pill,
                { height: pill, backgroundColor: colors['text-primary'] },
              ]}
            />
          )}
          <View
            style={[
              styles.tile,
              dashed
                ? {
                    borderWidth: size.strokeThick / 2,
                    borderStyle: 'dashed',
                    borderColor: colors['border-input'],
                  }
                : { backgroundColor: colors['surface-2'] },
              pressed && { backgroundColor: colors['surface-3'] },
            ]}
          >
            {children}
          </View>
          {mentions > 0 && (
            <View
              style={[
                styles.badge,
                { borderColor: colors.bg, backgroundColor: colors.bg },
              ]}
            >
              <Badge count={mentions} />
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}

// C-26 ServerRail: 💬, divider, servers (oldest joined first), ＋. Scrolls when long.
export function ServerRail({
  servers,
  selectedId,
  onSelect,
  onDirectMessages,
  onAdd,
}: {
  servers: readonly ServerSummary[];
  selectedId: string | null;
  onSelect: (serverId: string) => void;
  onDirectMessages: () => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <ScrollView
      style={[styles.rail, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.railContent}
      showsVerticalScrollIndicator={false}
    >
      <RailItem label={t('servers.drawer.dm')} onPress={onDirectMessages}>
        <Icon as={MessageCircle} size="lg" color="text-primary" />
      </RailItem>
      <View style={styles.dividerRow}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>
      {servers.map((server) => (
        <RailItem
          key={server.id}
          label={server.name}
          selected={server.id === selectedId}
          onPress={() => onSelect(server.id)}
        >
          <Text
            variant="label"
            weight="700"
            allowFontScaling={false}
            importantForAccessibility="no"
          >
            {railInitials(server.name)}
          </Text>
        </RailItem>
      ))}
      <RailItem label={t('servers.drawer.add')} dashed onPress={onAdd}>
        <Icon as={Plus} size="lg" color="primary" />
      </RailItem>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: { width: RAIL_WIDTH, flexGrow: 0 },
  railContent: { paddingVertical: space[2], gap: space[1] },
  item: {
    width: RAIL_WIDTH,
    height: ITEM.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    width: ITEM.tile,
    height: ITEM.tile,
    borderRadius: radius.server,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    left: 0,
    width: PILL.width,
    borderTopRightRadius: radius.badge,
    borderBottomRightRadius: radius.badge,
  },
  // Inside the 72 rail even at "99+" (Edge case many-servers).
  badge: {
    position: 'absolute',
    right: (RAIL_WIDTH - ITEM.tile) / 2 - BADGE_RING,
    bottom: (ITEM.height - ITEM.tile) / 2 - BADGE_RING,
    borderWidth: BADGE_RING,
    borderRadius: radius.full,
  },
  dividerRow: {
    height: DIVIDER.row,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: DIVIDER.width,
    height: DIVIDER.height,
    borderRadius: radius.full,
  },
});
