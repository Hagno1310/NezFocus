import {
  CircleAlert,
  Plus,
  SendHorizontal,
  Smile,
  type LucideIcon,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import type { Counter } from '../../domain/messages/chatRows';
import { radius, size, space, typography, useTheme } from '../theme';
import { IconButton } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

// C-11 `disabled`: the reason line in place of the input row.
export type ComposerBlock = { icon: LucideIcon; text: string };

const LINES = 5;
const BOX_MIN = 40;

// C-11: Enter is a new line, only ➤ sends (SRS 3.4); `+` and ☺ show once given a handler.
export function Composer({
  value,
  onChangeText,
  placeholder,
  counter,
  canSend,
  onSend,
  onAttach,
  onEmoji,
  disabled,
  above,
  selection,
  onSelectionChange,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  counter: Counter | null;
  canSend: boolean;
  onSend: () => void;
  // ponytail: `+` comes with attachments, P3-A2.2 (#124); ☺ with the EmojiPicker, P3-A1.2 (#121).
  onAttach?: () => void;
  onEmoji?: () => void;
  disabled?: ComposerBlock;
  // Context strip / tray over the input (reply, edit, attachments: P3).
  above?: ReactNode;
  // C-27: where the cursor is, to suggest for the @ / # being typed and to put it after one.
  selection?: { start: number; end: number };
  onSelectionChange?: (cursor: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const shell = [
    styles.shell,
    { backgroundColor: colors['surface-1'], borderTopColor: colors.border },
  ];

  if (disabled)
    return (
      <View style={[shell, styles.disabled]}>
        <Icon as={disabled.icon} size="sm" color="text-secondary" />
        <Text
          variant="label"
          weight="400"
          color="text-secondary"
          style={styles.flex}
        >
          {disabled.text}
        </Text>
      </View>
    );

  const over = counter?.kind === 'over';
  const counterText =
    counter && t(over ? 'chat.over' : 'chat.left', { n: counter.n });
  const a11yCounter =
    counter && t(over ? 'chat.a11yOver' : 'chat.a11yLeft', { n: counter.n });
  const lineHeight = typography.body.lineHeight;
  return (
    <View style={shell}>
      {over && (
        <View accessibilityLiveRegion="polite" style={styles.error}>
          <Icon as={CircleAlert} size="sm" color="danger" />
          <Text variant="label" weight="400" color="danger">
            {t('chat.tooLong')}
          </Text>
        </View>
      )}
      {above}
      <View style={styles.row}>
        {onAttach && (
          <IconButton icon={Plus} label={t('chat.attach')} onPress={onAttach} />
        )}
        <View
          style={[
            styles.box,
            !onAttach && styles.boxAlone,
            { backgroundColor: colors['surface-2'] },
          ]}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            selection={selection}
            onSelectionChange={(e) =>
              onSelectionChange?.(e.nativeEvent.selection.end)
            }
            placeholder={placeholder}
            placeholderTextColor={colors['text-tertiary']}
            multiline
            accessibilityLabel={
              a11yCounter ? `${placeholder}, ${a11yCounter}` : placeholder
            }
            style={[
              typography.body,
              styles.input,
              {
                color: colors['text-primary'],
                maxHeight: lineHeight * LINES,
              },
            ]}
          />
          {counterText && (
            <Text
              variant="label"
              color={over ? 'danger' : 'text-tertiary'}
              style={styles.counter}
            >
              {counterText}
            </Text>
          )}
        </View>
        {onEmoji && (
          <IconButton icon={Smile} label={t('chat.emoji')} onPress={onEmoji} />
        )}
        <IconButton
          icon={SendHorizontal}
          label={t('chat.send')}
          onPress={onSend}
          disabled={!canSend}
          color="primary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shell: { borderTopWidth: size.hairline },
  disabled: {
    minHeight: size.header,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingTop: space[2],
    paddingHorizontal: space[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[1],
  },
  box: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2],
    minHeight: BOX_MIN,
    paddingVertical: (BOX_MIN - typography.body.lineHeight) / 2,
    paddingHorizontal: 12,
    borderRadius: radius.input,
  },
  boxAlone: { marginLeft: space[1] },
  input: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'top',
  },
  counter: { paddingBottom: 2 },
});
