import type { MessageResponse } from '@nezfocus/shared';
import { PinOff } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { messageStore } from '../../../data/messages';
import { lastActive } from '../../../domain/account/sessions';
import { imagesOnly } from '../../../domain/messages/content';
import { parseMessage, spokenText } from '../../../domain/messages/markdown';
import { size, space, useTheme } from '../../../shared/theme';
import { EmptyState, Skeleton } from '../../../shared/ui/Feedback';
import { ActionSheet } from '../../../shared/ui/Overlay';
import { Avatar } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';
import { showActionError } from '../actionError';
import { avatarUri } from '../../me/avatarUri';
import { timeText } from '../chatText';
import { useChatClock } from '../hooks/useChatClock';

// S-HOME-03 `pins` / `pins-empty` (REQ-MSG-10): C-10 `pinned` rows, newest pin first. Tap →
// the message in the channel; long-press (who may pin) → "Bỏ ghim".
export function PinnedList({
  channelId,
  pins,
  canUnpin,
  online,
  onOpen,
}: {
  channelId: string;
  pins: readonly MessageResponse[] | null;
  canUnpin: boolean;
  online: boolean;
  onOpen: (message: MessageResponse) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { now, timeZone } = useChatClock();
  const [menu, setMenu] = useState<MessageResponse | null>(null);

  if (!pins)
    return (
      <View style={styles.loading}>
        {Array.from({ length: 3 }, (_, i) => (
          <View key={i} style={styles.skeleton}>
            <Skeleton width="40%" height={12} />
            <Skeleton width="90%" height={12} />
          </View>
        ))}
      </View>
    );
  if (!pins.length)
    return (
      <EmptyState title={t('chat.pinsEmpty')} body={t('chat.pinsEmptyBody')} />
    );

  const nameOf = (m: MessageResponse) =>
    m.author.display_name ?? m.author.username ?? t('ui.deletedUser');
  // C-10 `pinned`: 3 lines of the text; images only read as S-DM-01 does.
  const textOf = (m: MessageResponse) =>
    imagesOnly(m)
      ? t('chat.imageOnly')
      : spokenText(parseMessage(m.content), t('chat.spoiler'));

  return (
    <>
      <FlatList
        data={pins}
        keyExtractor={(m) => m.id}
        renderItem={({ item: m }) => {
          const time = timeText(t, lastActive(m.created_at, now, timeZone));
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('chat.a11yMessage', {
                name: nameOf(m),
                time: timeText(
                  t,
                  lastActive(m.created_at, now, timeZone),
                  true,
                ),
                content: textOf(m),
              })}
              onPress={() => onOpen(m)}
              onLongPress={canUnpin ? () => setMenu(m) : undefined}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors['overlay-pressed'] },
              ]}
            >
              <View style={styles.head}>
                <Avatar
                  name={nameOf(m)}
                  uri={avatarUri(m.author.avatar, '128')}
                  deleted={m.author.username === null}
                  size={size.avatar[1]}
                />
                <Text
                  variant="body-sm"
                  weight="600"
                  numberOfLines={1}
                  style={styles.shrink}
                >
                  {nameOf(m)}
                </Text>
                <Text variant="label" weight="400" color="text-tertiary">
                  {time}
                </Text>
              </View>
              <Text variant="body-sm" color="text-secondary" numberOfLines={3}>
                {textOf(m)}
              </Text>
            </Pressable>
          );
        }}
      />
      <ActionSheet
        visible={menu !== null}
        cancel={false}
        onDismiss={() => setMenu(null)}
        groups={[
          {
            items: [
              {
                label: t('chat.unpin'),
                icon: PinOff,
                disabled: !online,
                hint: online ? undefined : t('chat.needsNetwork'),
                onPress: () => {
                  const target = menu;
                  setMenu(null);
                  if (target)
                    void messageStore
                      .unpin(channelId, target.id)
                      .catch((err: unknown) => showActionError(t, err));
                },
              },
            ],
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  loading: { gap: space[4], padding: space[3] },
  skeleton: { gap: space[2] },
  row: {
    gap: size.iconGap,
    paddingVertical: size.pinRowPad,
    paddingHorizontal: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
