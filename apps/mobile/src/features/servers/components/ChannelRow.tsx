import type { ChannelResponse, FocusPhase } from '@nezfocus/shared';
import { Hash, LampDesk, Lock, Volume2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, size, space, useTheme } from '../../../shared/theme';
import { PhaseBadge } from '../../../shared/ui/Focus';
import { Icon } from '../../../shared/ui/Icon';
import { AvatarStack, Badge } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';

type Row = Pick<ChannelResponse, 'type' | 'name' | 'focus_control'>;

// C-05 variants: text `hash`, voice `volume-2`, Study Room (focus_control ≠ off) `lamp-desk`.
export const channelIcon = (c: Row) =>
  c.type === 'text' ? Hash : c.focus_control === 'off' ? Volume2 : LampDesk;

const ROW = 40; // C-05: 40 high, 4 apart; slop grows the target to 48
const UNREAD_DOT = { width: 4, height: 8 };

// C-05 ChannelRow: default / selected / pressed / unread / mention / voice-occupied /
// connected / no-connect / focus-running.
const noop = () => {};

export function ChannelRow({
  channel,
  selected = false,
  unread = false,
  mentions = 0,
  locked = false,
  connected = false,
  people = [],
  focus,
  onPress,
  onLongPress,
}: {
  channel: Row;
  selected?: boolean;
  unread?: boolean;
  mentions?: number;
  locked?: boolean; // C-05 `no-connect`: a voice channel without CONNECT (P3-B1.3 #139)
  connected?: boolean; // C-05 `connected`: I am in this voice room
  people?: { name: string; uri: string | null }[]; // C-05 `voice-occupied`
  // C-05 `focus-running`: at 390 the phase label only, no avatars (22/10/2026).
  focus?: {
    phase: FocusPhase;
    state: 'running' | 'paused';
    label: string;
  } | null;
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
        <Icon
          as={channelIcon(channel)}
          size="md"
          color={connected ? 'primary' : 'text-tertiary'}
        />
      </View>
      <Text
        style={styles.name}
        numberOfLines={1}
        weight={bold ? '600' : '500'}
        color={
          locked
            ? 'text-tertiary'
            : connected
              ? 'primary'
              : selected || bold
                ? 'text-primary'
                : 'text-secondary'
        }
      >
        {channel.name}
      </Text>
      {locked && <Icon as={Lock} size="xs" color="text-tertiary" />}
      {mentions > 0 && <Badge count={mentions} />}
      {focus ? (
        <View style={styles.people}>
          <PhaseBadge
            phase={focus.phase}
            state={focus.state}
            size="S"
            label={focus.label}
          />
        </View>
      ) : (
        people.length > 0 && (
          // Wraps under the name (board C-05 `CR sub`: 36 from the row's left edge).
          <View style={styles.people}>
            <AvatarStack people={people} size={20} ring="surface-1" />
          </View>
        )
      )}
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
  },
  people: { width: '100%', paddingLeft: size.icon.md + space[2] },
  unread: {
    position: 'absolute',
    left: 0,
    ...UNREAD_DOT,
    borderTopRightRadius: radius.badge,
    borderBottomRightRadius: radius.badge,
  },
  name: { flex: 1 },
});
