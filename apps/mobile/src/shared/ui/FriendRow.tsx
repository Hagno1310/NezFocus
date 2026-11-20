import type { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { space, useTheme } from '../theme';
import { Avatar, type Presence } from './People';
import { Text } from './Text';

// Cỡ chữ 200% (spec 09 › Tên + username): the username drops to its own line.
const STACK_SCALE = 1.5;

// C-33 FriendRow (board `Jpcbk`): avatar 40 · name + username (+ time) · line 2 · actions below
// or on the right. `presence` omitted = no PresenceDot (request and blocked rows, chốt 20/11/2026).
export function FriendRow({
  name,
  username,
  avatar,
  presence,
  dim = false,
  time,
  line2,
  below,
  right,
  onPress,
  onPressAvatar,
  accessibilityLabel,
}: {
  name: string;
  username: string;
  avatar?: string | null;
  presence?: Presence;
  dim?: boolean; // offline friend: name in text-secondary
  time?: string;
  line2?: ReactNode;
  below?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  onPressAvatar?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const stacked = useWindowDimensions().fontScale >= STACK_SCALE;
  const nameText = (
    <Text
      variant="body"
      weight="500"
      color={dim ? 'text-secondary' : 'text-primary'}
      numberOfLines={1}
      style={styles.name}
    >
      {name}
    </Text>
  );
  const usernameText = (
    <Text
      variant="label"
      color="text-tertiary"
      numberOfLines={1}
      style={styles.username}
    >
      {username}
    </Text>
  );
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.row,
        below ? styles.top : styles.center,
        pressed && { backgroundColor: colors['overlay-pressed'] },
      ]}
    >
      <Pressable
        disabled={!onPressAvatar}
        onPress={onPressAvatar}
        accessibilityRole={onPressAvatar ? 'button' : undefined}
        accessibilityLabel={onPressAvatar ? name : undefined}
      >
        <Avatar name={name} uri={avatar} size={40} presence={presence} />
      </Pressable>
      <View style={styles.body}>
        {stacked ? (
          <>
            <View style={styles.line}>
              {nameText}
              {time && <Time text={time} />}
            </View>
            {usernameText}
          </>
        ) : (
          <View style={styles.line}>
            {nameText}
            {usernameText}
            {time && <Time text={time} />}
          </View>
        )}
        {line2}
        {below && <View style={styles.below}>{below}</View>}
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </Pressable>
  );
}

function Time({ text }: { text: string }) {
  return (
    <Text variant="label" color="text-tertiary" style={styles.time}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Board: pad [10, 8, 10, 16], gap 12. Request rows: time 16 from the edge (chốt 20/11/2026).
  row: {
    flexDirection: 'row',
    gap: 12, // board `Jpcbk`, off the space scale like C-40
    paddingVertical: 10, // board `Jpcbk`
    paddingLeft: space[3],
    paddingRight: space[2],
  },
  center: { alignItems: 'center' },
  top: { alignItems: 'flex-start', paddingRight: space[3] },
  body: { flex: 1, minWidth: 0, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  // C-33 › Cắt: the username gives way before the name.
  name: { flexShrink: 1 },
  username: { flexShrink: 1000 },
  time: { marginLeft: 'auto', flexShrink: 0 },
  below: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
    paddingTop: space[2],
  },
  right: { flexDirection: 'row', alignItems: 'center' },
});
