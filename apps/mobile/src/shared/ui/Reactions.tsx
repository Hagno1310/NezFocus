import type { Reaction } from '@nezfocus/shared';
import { CornerUpRight, SmilePlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';
import {
  disabledOpacity,
  radius,
  size,
  space,
  touchSlop,
  typography,
  useTheme,
} from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

const { chip: CHIP, quick: QUICK } = size.reaction;
// Chips sit side by side: only the height grows to 48 (DESIGN.md › Touch).
const CHIP_SLOP = { top: touchSlop(CHIP), bottom: touchSlop(CHIP) };
const emojiText = (px: number) => ({ fontSize: px, lineHeight: px + 4 });

// C-10 ReactionChip: emoji + count; mine = `surface-3` with a `primary` edge. Also the emoji
// tabs of "Ai đã thả cảm xúc".
export function ReactionChip({
  reaction,
  label,
  role = 'button',
  disabled = false,
  onPress,
  onLongPress,
}: {
  reaction: Reaction;
  label: string;
  role?: 'button' | 'tab';
  disabled?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ selected: reaction.me, disabled }}
      disabled={disabled}
      hitSlop={CHIP_SLOP}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: reaction.me
            ? colors['surface-3']
            : colors['surface-2'],
          borderColor: reaction.me ? colors.primary : colors['surface-2'],
        },
        pressed && { backgroundColor: colors['overlay-pressed'] },
      ]}
    >
      <RNText style={styles.chipEmoji}>{reaction.emoji}</RNText>
      <Text variant="label" weight="600" color="text-secondary">
        {String(reaction.count)}
      </Text>
    </Pressable>
  );
}

// C-10 `reaction`: the chips under a message, wrapping (02 `long-message`), the add chip last.
// Chạm → bật / tắt; nhấn giữ → "Ai đã thả cảm xúc".
export function ReactionChips({
  reactions,
  onToggle,
  onLongPress,
  onAdd,
  disabled = false,
}: {
  reactions: readonly Reaction[];
  onToggle: (emoji: string) => void;
  onLongPress: (emoji: string) => void;
  onAdd?: () => void; // hidden without ADD_REACTIONS
  disabled?: boolean; // timed out or offline (chốt 26/11/2026): chips do not answer
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!reactions.length) return null;
  return (
    <View style={styles.chips}>
      {reactions.map((r) => (
        <ReactionChip
          key={r.emoji}
          reaction={r}
          disabled={disabled}
          label={t(r.me ? 'chat.a11yReactionMine' : 'chat.a11yReaction', {
            emoji: r.emoji,
            count: r.count,
          })}
          onPress={() => onToggle(r.emoji)}
          onLongPress={() => onLongPress(r.emoji)}
        />
      ))}
      {onAdd && !disabled && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('chat.addReaction')}
          hitSlop={CHIP_SLOP}
          onPress={onAdd}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: colors['surface-2'],
              borderColor: colors['surface-2'],
            },
            pressed && { backgroundColor: colors['overlay-pressed'] },
          ]}
        >
          <Icon as={SmilePlus} size="sm" color="text-secondary" />
        </Pressable>
      )}
    </View>
  );
}

// S-HOME-04: six 44 circles (48 to touch), then smile-plus for the EmojiPicker. At 200% it
// scrolls sideways (checklist). `disabled` offline, with the reason under it.
export function QuickReactions({
  emoji,
  onPick,
  onMore,
  disabled,
  hint,
}: {
  emoji: readonly string[];
  onPick: (emoji: string) => void;
  onMore: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const circle = (pressed: boolean) => [
    styles.quick,
    { backgroundColor: colors['surface-2'] },
    disabled && styles.dim,
    pressed && { backgroundColor: colors['overlay-pressed'] },
  ];
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRow}
      >
        {emoji.map((e) => (
          <Pressable
            key={e}
            accessibilityRole="button"
            accessibilityLabel={t('chat.a11yReact', { emoji: e })}
            accessibilityState={{ disabled: !!disabled }}
            disabled={disabled}
            hitSlop={touchSlop(QUICK)}
            onPress={() => onPick(e)}
            style={({ pressed }) => circle(pressed)}
          >
            <RNText style={styles.quickEmoji}>{e}</RNText>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('chat.addReaction')}
          accessibilityState={{ disabled: !!disabled }}
          disabled={disabled}
          hitSlop={touchSlop(QUICK)}
          onPress={onMore}
          style={({ pressed }) => circle(pressed)}
        >
          <Icon as={SmilePlus} size="lg" color="text-secondary" />
        </Pressable>
      </ScrollView>
      {disabled && hint && (
        <Text variant="label" color="text-tertiary" style={styles.hint}>
          {hint}
        </Text>
      )}
    </View>
  );
}

// C-10 `reply`: over the name. The original gone: "Tin nhắn gốc đã bị xóa" in italics, no name.
export function ReplyLine({
  name,
  text,
  onPress,
}: {
  name: string | null; // null: the original was deleted
  text: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      hitSlop={touchSlop(typography.label.lineHeight)}
      style={styles.reply}
    >
      <Icon as={CornerUpRight} size="xs" color="text-tertiary" />
      {name !== null && (
        <Text
          variant="label"
          weight="600"
          color="text-secondary"
          numberOfLines={1}
          style={styles.replyName}
        >
          {name}
        </Text>
      )}
      <Text
        variant="label"
        weight="400"
        color="text-tertiary"
        numberOfLines={1}
        style={[styles.shrink, name === null && styles.italic]}
      >
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  italic: { fontStyle: 'italic' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: size.iconGap,
    paddingTop: size.iconGap,
  },
  chip: {
    height: CHIP,
    minWidth: CHIP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    paddingHorizontal: size.reaction.chipSide,
    borderRadius: radius.full,
    borderWidth: size.hairline,
  },
  chipEmoji: emojiText(size.reaction.chipEmoji),
  // Frame: spread across the width (space-between), so 7 × 44 still fits a 360 screen.
  quickRow: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingTop: space[1],
    paddingHorizontal: space[3],
  },
  quick: {
    width: QUICK,
    height: QUICK,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickEmoji: emojiText(size.reaction.quickEmoji),
  dim: { opacity: disabledOpacity },
  hint: { paddingHorizontal: space[3], paddingTop: space[2] },
  reply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: size.iconGap,
  },
  replyName: { flexShrink: 0, maxWidth: '50%' },
});
