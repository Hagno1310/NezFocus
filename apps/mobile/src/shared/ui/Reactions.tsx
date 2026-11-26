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
import { radius, size, space, useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

const CHIP = 32;
const QUICK = 44;

// C-10 `reaction`: ReactionChip pills under the message, wrapping (02 `long-message`), the
// add chip last. Chạm → bật / tắt; nhấn giữ → "Ai đã thả cảm xúc".
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
  onAdd?: () => void; // hidden without ADD_REACTIONS, timed out or offline
  disabled?: boolean; // timed out (chốt 26/11/2026): chips do not answer a tap
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!reactions.length) return null;
  return (
    <View style={styles.chips}>
      {reactions.map((r) => (
        <Pressable
          key={r.emoji}
          accessibilityRole="button"
          accessibilityLabel={t(
            r.me ? 'chat.a11yReactionMine' : 'chat.a11yReaction',
            {
              emoji: r.emoji,
              count: r.count,
            },
          )}
          accessibilityState={{ selected: r.me, disabled }}
          disabled={disabled}
          onPress={() => onToggle(r.emoji)}
          onLongPress={() => onLongPress(r.emoji)}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: r.me ? colors['surface-3'] : colors['surface-2'],
              borderColor: r.me ? colors.primary : colors['surface-2'],
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <RNText style={styles.chipEmoji}>{r.emoji}</RNText>
          <Text variant="label" weight="600" color="text-secondary">
            {String(r.count)}
          </Text>
        </Pressable>
      ))}
      {onAdd && !disabled && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('chat.addReaction')}
          onPress={onAdd}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: colors['surface-2'],
              borderColor: colors['surface-2'],
            },
            pressed && { opacity: 0.7 },
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
  const circle = [styles.quick, { backgroundColor: colors['surface-2'] }];
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
            hitSlop={(size.touch - QUICK) / 2}
            onPress={() => onPick(e)}
            style={({ pressed }) => [
              circle,
              disabled && styles.dim,
              pressed && { backgroundColor: colors['surface-3'] },
            ]}
          >
            <RNText style={styles.quickEmoji}>{e}</RNText>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('chat.addReaction')}
          accessibilityState={{ disabled: !!disabled }}
          disabled={disabled}
          hitSlop={(size.touch - QUICK) / 2}
          onPress={onMore}
          style={({ pressed }) => [
            circle,
            disabled && styles.dim,
            pressed && { backgroundColor: colors['surface-3'] },
          ]}
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
      hitSlop={space[1]}
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
    gap: 6,
    paddingTop: 6,
  },
  chip: {
    height: CHIP,
    minWidth: CHIP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: size.hairline,
  },
  chipEmoji: { fontSize: 16, lineHeight: 20 },
  quickRow: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: space[2],
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
  quickEmoji: { fontSize: 22, lineHeight: 28 },
  dim: { opacity: 0.4 },
  hint: { paddingHorizontal: space[3], paddingTop: space[2] },
  reply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  replyName: { flexShrink: 0, maxWidth: '50%' },
});
