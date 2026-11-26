import {
  Apple,
  Car,
  Cat,
  Heart,
  History,
  Lightbulb,
  SearchX,
  Smile,
  Volleyball,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text as RNText,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  emojiIndex,
  searchEmoji,
  type Emoji,
  type EmojiRow,
} from '../../domain/emoji/emojiSearch';
import data from '../emoji/emojiData.json';
import { radius, size, space, touchSlop, useTheme } from '../theme';
import { Icon, type IconComponent } from './Icon';
import { PlainSheet, type Lifted } from './Overlay';
import { Text } from './Text';
import { SearchField } from './TextField';

const COLUMNS = 8;
const CELL = size.emojiCell;
// Cells touch each other: only the height grows to 48.
const CELL_SLOP = { top: touchSlop(CELL), bottom: touchSlop(CELL) };
const HEIGHT = 358;

// Frame S-HOME-04 `emoji-picker`: the category bar, in order (C-25, chốt 26/11/2026).
const CATEGORIES: { icon: IconComponent; key: string }[] = [
  { icon: Smile, key: 'smileys' },
  { icon: Cat, key: 'animals' },
  { icon: Apple, key: 'food' },
  { icon: Volleyball, key: 'activities' },
  { icon: Car, key: 'travel' },
  { icon: Lightbulb, key: 'objects' },
  { icon: Heart, key: 'symbols' },
];

let index: ReturnType<typeof emojiIndex> | null = null;
const theIndex = () => (index ??= emojiIndex(data as EmojiRow[]));

const rowsOf = (list: readonly string[]) => {
  const out: string[][] = [];
  for (let i = 0; i < list.length; i += COLUMNS)
    out.push(list.slice(i, i + COLUMNS));
  return out;
};

type Section = { key: string; title: string; data: string[][] };

// C-25 EmojiPicker in a sheet (S-HOME-04 `emoji-picker`): search, recent, the grid by
// category, the category bar at the bottom. Emoji are the system's.
export function EmojiPicker({
  visible,
  recent,
  onPick,
  onDismiss,
  lifted,
}: {
  visible: boolean;
  recent: readonly string[];
  onPick: (emoji: string) => void;
  onDismiss: () => void;
  lifted?: Lifted;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('smileys');
  const list = useRef<SectionList<string[], Section>>(null);
  const lang = i18n.language.startsWith('en') ? 'en' : 'vi';

  const sections = useMemo((): Section[] => {
    if (query.trim()) {
      const found = searchEmoji(theIndex(), query, lang).map(
        (e: Emoji) => e.emoji,
      );
      return found.length
        ? [
            {
              key: 'results',
              title: t('chat.emojiPicker.results'),
              data: rowsOf(found),
            },
          ]
        : [];
    }
    const by = CATEGORIES.map((): string[] => []);
    for (const e of theIndex()) by[e.category]?.push(e.emoji);
    return [
      ...(recent.length
        ? [
            {
              key: 'recent',
              title: t('chat.emojiPicker.recent'),
              data: rowsOf(recent),
            },
          ]
        : []),
      ...CATEGORIES.map((c, i) => ({
        key: c.key,
        title: t(`chat.emojiPicker.${c.key}` as 'chat.emojiPicker.smileys'),
        data: rowsOf(by[i] ?? []),
      })),
    ];
  }, [query, lang, recent, t]);

  const jump = (key: string) => {
    setActive(key);
    const at = sections.findIndex((s) => s.key === key);
    if (at >= 0)
      list.current?.scrollToLocation({
        sectionIndex: at,
        itemIndex: 0,
        viewOffset: 0,
        animated: false,
      });
  };

  const close = () => {
    setQuery('');
    onDismiss();
  };

  return (
    <PlainSheet visible={visible} onDismiss={close} lifted={lifted}>
      <View style={{ height: Math.min(HEIGHT, height * 0.6) }}>
        <View style={styles.search}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('chat.emojiPicker.search')}
          />
        </View>
        {sections.length ? (
          <SectionList
            ref={list}
            sections={sections}
            keyExtractor={(row, i) => `${row[0]}-${i}`}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            initialNumToRender={12}
            renderSectionHeader={({ section }) => (
              <Text
                variant="label"
                weight="600"
                color="text-tertiary"
                style={styles.sectionTitle}
              >
                {section.title}
              </Text>
            )}
            renderItem={({ item }) => (
              <View style={styles.row}>
                {item.map((e) => (
                  <Pressable
                    key={e}
                    accessibilityRole="button"
                    accessibilityLabel={e}
                    hitSlop={CELL_SLOP}
                    onPress={() => {
                      setQuery('');
                      onPick(e);
                    }}
                    style={({ pressed }) => [
                      styles.cell,
                      pressed && { backgroundColor: colors['surface-2'] },
                    ]}
                  >
                    <RNText style={styles.emoji}>{e}</RNText>
                  </Pressable>
                ))}
                {/* A short last row keeps the cells of a full one. */}
                {Array.from({ length: COLUMNS - item.length }, (_, i) => (
                  <View key={`gap-${i}`} style={styles.gap} />
                ))}
              </View>
            )}
            contentContainerStyle={styles.grid}
          />
        ) : (
          <View style={styles.empty}>
            <Icon as={SearchX} size="xl" color="text-tertiary" />
            <Text color="text-secondary">{t('chat.emojiPicker.empty')}</Text>
          </View>
        )}
        {!query.trim() && (
          <View style={[styles.bar, { borderTopColor: colors.border }]}>
            {recent.length > 0 && (
              <CategoryButton
                icon={History}
                selected={active === 'recent'}
                label={t('chat.emojiPicker.recent')}
                onPress={() => jump('recent')}
              />
            )}
            {CATEGORIES.map((c) => (
              <CategoryButton
                key={c.key}
                icon={c.icon}
                selected={active === c.key}
                label={t(
                  `chat.emojiPicker.${c.key}` as 'chat.emojiPicker.smileys',
                )}
                onPress={() => jump(c.key)}
              />
            ))}
          </View>
        )}
      </View>
    </PlainSheet>
  );
}

function CategoryButton({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: IconComponent;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={space[2]}
      style={styles.category}
    >
      <Icon
        as={icon}
        size="md"
        color={selected ? 'primary' : 'text-tertiary'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: { paddingHorizontal: space[3], paddingBottom: space[2] },
  // Frame: 12 at the sides (16 less the 4 inside each cell).
  grid: { paddingHorizontal: space[3] - space[1], paddingBottom: space[2] },
  sectionTitle: { paddingVertical: space[1], paddingHorizontal: space[1] },
  row: { flexDirection: 'row' },
  // 8 columns of 44 on a 390 screen; narrower screens shrink the cells, never the columns.
  cell: {
    flex: 1,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.input,
  },
  gap: { flex: 1 },
  emoji: { fontSize: size.emojiGlyph, lineHeight: size.emojiGlyph + 6 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: space[2],
    paddingHorizontal: space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  category: { padding: space[1] },
});
