import { Hash, Users } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { radius, size, space, useTheme } from '../theme';
import { Icon } from './Icon';
import { Avatar } from './People';
import { Text } from './Text';

const ROW = size.touch; // C-27: rows 48
const MAX_ROWS = 5;
const PAD = space[1];

export type SuggestRow =
  | {
      kind: 'member';
      key: string;
      name: string;
      sub: string | null;
      uri: string | null;
    }
  | { kind: 'group'; key: string; name: string; sub: string | null } // role, @everyone / @here
  | { kind: 'channel'; key: string; name: string };

export type SuggestSection = { title: string | null; rows: SuggestRow[] };

// C-27 MentionSuggest: above the Composer, `surface-1`, a `border` line on top; at most 5 rows
// show (group titles 28 on top of that), the rest scrolls.
export function MentionSuggest({
  sections,
  onPick,
}: {
  sections: SuggestSection[];
  onPick: (key: string) => void;
}) {
  const { colors } = useTheme();
  const rows = sections.reduce((n, s) => n + s.rows.length, 0);
  if (!rows) return null;
  const titles = sections.filter((s) => s.title).length;
  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: colors['surface-1'],
          borderTopColor: colors.border,
          maxHeight:
            Math.min(rows, MAX_ROWS) * ROW + titles * size.groupTitle + PAD * 2,
        },
      ]}
    >
      <ScrollView
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.pad}
      >
        {sections.map((section, i) => (
          <View key={section.title ?? i}>
            {section.title && (
              <View style={styles.title}>
                <Text variant="label" weight="600" color="text-tertiary">
                  {section.title}
                </Text>
              </View>
            )}
            {section.rows.map((row) => (
              <Pressable
                key={row.key}
                accessibilityRole="button"
                accessibilityLabel={
                  row.kind === 'channel'
                    ? `#${row.name}`
                    : [row.name, row.sub].filter(Boolean).join(', ')
                }
                onPress={() => onPick(row.key)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: colors['surface-2'] },
                ]}
              >
                {row.kind === 'member' && (
                  <Avatar name={row.name} uri={row.uri} size={size.avatar[1]} />
                )}
                {row.kind === 'group' && (
                  <View
                    style={[
                      styles.circle,
                      { backgroundColor: colors['surface-2'] },
                    ]}
                  >
                    <Icon as={Users} size="xs" color="text-secondary" />
                  </View>
                )}
                {row.kind === 'channel' && (
                  <Icon as={Hash} size="base" color="text-secondary" />
                )}
                <Text weight="600" numberOfLines={1} style={styles.name}>
                  {row.name}
                </Text>
                {row.kind !== 'channel' && row.sub && (
                  <Text
                    variant="label"
                    weight="400"
                    color="text-tertiary"
                    numberOfLines={1}
                    style={styles.sub}
                  >
                    {row.sub}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderTopWidth: size.hairline },
  pad: { paddingVertical: PAD },
  title: {
    height: size.groupTitle,
    justifyContent: 'center',
    paddingHorizontal: space[3],
  },
  row: {
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: space[3],
  },
  circle: {
    width: size.avatar[1],
    height: size.avatar[1],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flexShrink: 0, maxWidth: '60%' },
  sub: { flex: 1 },
});
