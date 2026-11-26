import type { MessageAuthor, MessageResponse } from '@nezfocus/shared';
import {
  Copy,
  Flag,
  Link,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Trash2,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import type {
  MessageSheet,
  SheetRow,
} from '../../../domain/messages/messageActions';
import { QUICK_REACTIONS } from '../../../domain/messages/reactions';
import { radius, size, space, useTheme } from '../../../shared/theme';
import { EmojiPicker } from '../../../shared/ui/EmojiPicker';
import type { IconComponent } from '../../../shared/ui/Icon';
import { MemberRow } from '../../../shared/ui/MemberRow';
import {
  ActionSheet,
  BottomSheet,
  Dialog,
  type ActionItem,
} from '../../../shared/ui/Overlay';
import { QuickReactions, ReactionChip } from '../../../shared/ui/Reactions';
import { Text } from '../../../shared/ui/Text';
import { avatarUri } from '../../me/avatarUri';
import type { MessageActions } from '../hooks/useMessageActions';

const ICONS: Record<SheetRow, IconComponent> = {
  reply: Reply,
  edit: Pencil,
  pin: Pin,
  unpin: PinOff,
  copyText: Copy,
  copyLink: Link,
  report: Flag,
  delete: Trash2,
};

// S-HOME-04 and what it opens: the sheet, `emoji-picker`, `delete-confirm`, and the
// "Ai đã thả cảm xúc" sheet (chốt 26/11/2026).
export function MessageSheets({
  actions,
  sheetOf,
  nameOf,
  timeOf,
  onInsert,
}: {
  actions: MessageActions;
  onInsert: (emoji: string) => void;
  sheetOf: (message: MessageResponse) => MessageSheet | null;
  nameOf: (author: MessageAuthor) => string;
  timeOf: (message: MessageResponse) => string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const target = actions.sheet;
  const sheet = target && sheetOf(target.message);

  const run: Record<SheetRow, (m: MessageResponse) => void> = {
    reply: actions.reply,
    edit: actions.edit,
    pin: actions.pin,
    unpin: actions.unpin,
    copyText: actions.copyText,
    copyLink: actions.copyLink,
    // ponytail: "Báo cáo" opens S-MOD-02 with P3-A5.2 (#135); until then the row only shows.
    report: () => actions.close(),
    delete: (m) => actions.askDelete({ message: m, lifted: target?.lifted }),
  };
  const items: ActionItem[] =
    sheet && target
      ? sheet.rows.map(({ row, disabled }) => ({
          label: t(row === 'delete' ? 'chat.deleteMessage' : `chat.${row}`),
          icon: ICONS[row],
          destructive: row === 'delete',
          disabled,
          hint: disabled ? t('chat.needsNetwork') : undefined,
          onPress: () => run[row](target.message),
        }))
      : [];

  const deleting = actions.deleting?.message;
  return (
    <>
      <ActionSheet
        visible={!!sheet}
        cancel={false}
        lifted={target?.lifted}
        onDismiss={actions.close}
        top={
          sheet && target && sheet.reactions !== 'off' ? (
            <QuickReactions
              emoji={QUICK_REACTIONS}
              disabled={sheet.reactions === 'disabled'}
              hint={t('chat.needsNetwork')}
              onPick={(e) => {
                actions.close();
                actions.react(target.message, e);
              }}
              onMore={() => actions.openPicker(target)}
            />
          ) : undefined
        }
        groups={[{ items }]}
      />
      <EmojiPicker
        visible={!!actions.picker}
        recent={actions.recent.length ? actions.recent : [...QUICK_REACTIONS]}
        lifted={actions.picker?.lifted}
        onDismiss={actions.closePicker}
        onPick={(e) => {
          const m = actions.picker?.message;
          actions.closePicker();
          // C-25 from the Composer's ☺: into the text, not a reaction.
          if (m) actions.react(m, e);
          else onInsert(e);
        }}
      />
      <Dialog
        visible={!!deleting}
        title={t('chat.deleteTitle')}
        body={t('chat.deleteBody')}
        lifted={actions.deleting?.lifted}
        row
        cancel={{ label: t('chat.cancel'), onPress: actions.cancelDelete }}
        confirm={{
          label: t('chat.deleteConfirm'),
          variant: 'danger',
          onPress: () => deleting && actions.remove(deleting),
        }}
        onDismiss={actions.cancelDelete}
      >
        {deleting && (
          <View
            style={[styles.preview, { backgroundColor: colors['surface-2'] }]}
          >
            <Text variant="label" weight="600" color="text-secondary">
              {`${nameOf(deleting.author)} · ${timeOf(deleting)}`}
            </Text>
            <Text variant="body-sm" numberOfLines={2}>
              {/* A system message has no content of its own: its wording (CR-24). */}
              {deleting.type === 'member_join'
                ? t('chat.memberJoin', { name: nameOf(deleting.author) })
                : deleting.content}
            </Text>
          </View>
        )}
      </Dialog>
      <Reactors actions={actions} nameOf={nameOf} />
    </>
  );
}

// 02 S-HOME-01 › Tương tác, chốt 26/11/2026: chips of the message on top, the people below.
function Reactors({
  actions,
  nameOf,
}: {
  actions: MessageActions;
  nameOf: (author: MessageAuthor) => string;
}) {
  const { t } = useTranslation();
  const open = actions.reactors;

  return (
    <BottomSheet
      visible={!!open}
      title={t('chat.reactors')}
      onDismiss={actions.closeReactors}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {/* The selected emoji is the tab, drawn as a chip of mine (C-10). */}
        {open?.message.reactions.map((r) => (
          <ReactionChip
            key={r.emoji}
            role="tab"
            reaction={{ ...r, me: r.emoji === open.emoji }}
            label={t('chat.a11yReaction', { emoji: r.emoji, count: r.count })}
            onPress={() => actions.pickReactors(r.emoji)}
          />
        ))}
      </ScrollView>
      {open?.people?.map((p) => (
        <MemberRow
          key={p.id}
          name={nameOf(p)}
          username={p.username}
          avatar={avatarUri(p.avatar, '128')}
        />
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Frame `delete-confirm`: 2 between the lines, 12 inside.
  preview: {
    gap: space[1] / 2,
    padding: space[3] - space[1],
    borderRadius: radius.input,
  },
  tabs: { gap: size.iconGap, paddingBottom: space[2] },
});
