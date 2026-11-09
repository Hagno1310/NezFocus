import type { ChannelResponse } from '@nezfocus/shared';
import { Hash, LampDesk, Volume2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, space, useTheme } from '../../../shared/theme';
import { Icon } from '../../../shared/ui/Icon';
import { Badge } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';

type Row = Pick<ChannelResponse, 'type' | 'name' | 'focus_control'>;

// C-05 variants: text `hash`, voice `volume-2`, Study Room (focus_control ≠ off) `lamp-desk`.
export const channelIcon = (c: Row) =>
  c.type === 'text' ? Hash : c.focus_control === 'off' ? Volume2 : LampDesk;

const ROW = 40; // C-05: 40 high, 4 apart; slop grows the target to 48
const UNREAD_DOT = { width: 4, height: 8 };

// C-05 ChannelRow. P1 draws default / selected / pressed; unread and mention come with
// read state (P2-A4 #17), the Room Session line with P3-B3 (#28).
const noop = () => {};

export function ChannelRow({
  channel,
  selected = false,
  unread = false,
  mentions = 0,
  onPress,
  onLongPress,
}: {
  channel: Row;
  selected?: boolean;
  unread?: boolean;
  mentions?: number;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const { colors } = useTheme();
  const bold = unread || mentions > 0;
  const label = channel.type === 'text' ? `# ${channel.name}` : channel.name;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      // 02 `channel-menu`: without the permission a long press does nothing; with no
      // handler at all, Pressable would open the channel when the finger lifts.
      onLongPress={onLongPress ?? noop}
      hitSlop={{ top: space[1] / 2, bottom: space[1] / 2 }}
      style={({ pressed }) => [
        styles.row,
        (selected || pressed) && { backgroundColor: colors['surface-2'] },
      ]}
    >
      {bold && (
        <View
          style={[styles.unread, { backgroundColor: colors['text-primary'] }]}
        />
      )}
      <View importantForAccessibility="no-hide-descendants">
        <Icon as={channelIcon(channel)} size="md" color="text-tertiary" />
      </View>
      <Text
        style={styles.name}
        numberOfLines={1}
        weight={bold ? '600' : '500'}
        color={selected || bold ? 'text-primary' : 'text-secondary'}
      >
        {channel.name}
      </Text>
      {mentions > 0 && <Badge count={mentions} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW,
    marginBottom: space[1],
    paddingHorizontal: space[2],
    paddingVertical: space[2],
    borderRadius: radius.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  unread: {
    position: 'absolute',
    left: 0,
    ...UNREAD_DOT,
    borderTopRightRadius: radius.badge,
    borderBottomRightRadius: radius.badge,
  },
  name: { flex: 1 },
});
