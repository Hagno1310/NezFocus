import type { StudyActivity } from '@nezfocus/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, space, useTheme } from '../theme';
import { ActivityLine } from './ActivityLine';
import { Avatar, Badge, type Presence } from './People';
import { Text } from './Text';

// C-32 DMRow (board `HKQIT`): avatar 40 · name + time · line 2 (last message or short
// activity) + unread badge. No username (spec 09 › Tên + username).
export function DMRow({
  name,
  avatar,
  deleted = false,
  presence,
  time,
  message,
  activity,
  unread = 0,
  onPress,
  onLongPress,
}: {
  name: string;
  avatar?: string | null;
  deleted?: boolean;
  presence?: Presence;
  time?: string;
  message?: string; // already "Bạn: …"
  activity?: StudyActivity | null;
  unread?: number; // > 0: name and message in bold, badge
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const { colors } = useTheme();
  const bold = unread > 0;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors['overlay-pressed'] },
      ]}
    >
      <Avatar
        name={name}
        uri={avatar}
        deleted={deleted}
        size={40}
        presence={deleted ? undefined : presence}
        ring="surface-1"
      />
      <View style={styles.body}>
        <View style={styles.line}>
          <Text
            variant="body"
            weight={bold ? '600' : '500'}
            numberOfLines={1}
            style={styles.flex}
          >
            {name}
          </Text>
          {time && (
            <Text variant="label" weight="400" color="text-tertiary">
              {time}
            </Text>
          )}
        </View>
        <View style={styles.line}>
          <View style={styles.flex}>
            {activity ? (
              <ActivityLine activity={activity} form="short" />
            ) : message ? (
              <Text
                variant="body-sm"
                weight={bold ? '600' : '400'}
                color={bold ? 'text-primary' : 'text-secondary'}
                numberOfLines={1}
              >
                {message}
              </Text>
            ) : null}
          </View>
          {bold && <Badge count={unread} />}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // board `HKQIT`, off the space scale like C-33
    padding: space[2],
    borderRadius: radius.input,
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  flex: { flex: 1, minWidth: 0 },
});
