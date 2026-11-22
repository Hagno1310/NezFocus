import type { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { space, useTheme, type ColorToken } from '../theme';
import { Avatar, type Presence } from './People';
import { Text } from './Text';

// Cỡ chữ 200% (C-28): username drops to its own line, the role below it.
const STACK_SCALE = 1.5;

// C-28 MemberRow (board `D7u9j`): avatar 32 · name + username on one line · role on the right ·
// optional line 2 (ActivityLine short), 48 / 56 high. `variant="username"` (board `dAf0v`,
// lists to pick or act on someone): username under the name, always 56.
export function MemberRow({
  name,
  username,
  avatar,
  presence,
  label,
  labelColor = 'text-tertiary',
  line2,
  right,
  variant = 'inline',
  onPress,
  accessibilityLabel,
}: {
  name: string;
  username: string | null;
  avatar?: string | null;
  presence?: Presence;
  label?: string | null; // "Owner" / highest role / "Tạm khóa tới 21:12"
  labelColor?: ColorToken;
  line2?: ReactNode;
  right?: ReactNode; // `x`, Checkbox: in place of the label's end of the row
  variant?: 'inline' | 'username';
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const stacked = variant === 'username' || fontScale >= STACK_SCALE;
  const offline = presence === 'offline';
  const nameText = (
    <Text
      color={
        offline && variant === 'inline' ? 'text-secondary' : 'text-primary'
      }
      numberOfLines={1}
      style={styles.name}
    >
      {name}
    </Text>
  );
  const usernameText = username ? (
    <Text
      variant="label"
      color="text-tertiary"
      numberOfLines={1}
      style={styles.username}
    >
      {username}
    </Text>
  ) : null;
  // C-28: inline, the role belongs to line 1 so line 2 (activity) runs the full width; at 200%
  // it drops under the username. `username` keeps it centred on the right of the row.
  const inline = variant === 'inline';
  const labelText = label ? (
    <Text
      variant="label"
      color={labelColor}
      numberOfLines={1}
      style={[styles.label, inline && !stacked && styles.end]}
    >
      {label}
    </Text>
  ) : null;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.row,
        { minHeight: variant === 'username' || line2 ? 56 : 48 },
        pressed && { backgroundColor: colors['overlay-pressed'] },
      ]}
    >
      <Avatar name={name} uri={avatar} size={32} presence={presence} />
      <View style={styles.body}>
        {stacked ? (
          <>
            {nameText}
            {usernameText}
            {inline && labelText}
          </>
        ) : (
          <View style={styles.line}>
            {nameText}
            {usernameText}
            {inline && labelText}
          </View>
        )}
        {line2}
      </View>
      {!inline && labelText}
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Board: pad [0, 16], gap 12.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // board `D7u9j`, off the space scale like C-33
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  body: { flex: 1, minWidth: 0 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  // C-28 › Thiếu chỗ: the username gives way first, then the name; the role after the username.
  name: { flexShrink: 1 },
  username: { flexShrink: 1000 },
  label: { flexShrink: 100 },
  end: { marginLeft: 'auto' },
});
