import type { StudyActivity } from '@nezfocus/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useStore } from 'zustand';
import {
  friendsStore,
  nameOf,
  studyingFriends,
} from '../../../domain/friends/friends';
import { presenceStore } from '../../../domain/presence/presence';
import { space, useTheme } from '../../../shared/theme';
import { PhaseBadge } from '../../../shared/ui/Focus';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { Avatar, AvatarStack } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';
import { Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Icon } from '../../../shared/ui/Icon';

const presenceOf = (id: string) =>
  presenceStore.getState().others[id] ?? {
    user_id: id,
    status: 'offline' as const,
    activity: null,
  };

// 04 › Ai được đếm: one list for the line and the sheet, live with presence.
export function useStudyingFriends() {
  const state = useStore(friendsStore);
  useStore(presenceStore, (s) => s.others);
  return studyingFriends(state, presenceOf);
}

// "còn N phút" moves with the minute, like C-40.
function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// S-STUDY-02 line "{N} bạn đang học lúc này": hidden when nobody (P1-B2.2 #82 left it for #19).
export function FriendsStudyingLine({
  count,
  people,
  onPress,
}: {
  count: number;
  people: { name: string; uri?: string | null }[];
  onPress: () => void;
}) {
  const { t } = useTranslation();
  if (!count) return null;
  const line = t('friends.studying.line', { count });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={line}
      onPress={onPress}
      style={styles.line}
    >
      <AvatarStack people={people} size={24} />
      <Text variant="label" weight="500" color="text-secondary">
        {line}
      </Text>
      <Icon as={ChevronRight} size="xs" color="text-secondary" />
    </Pressable>
  );
}

// S-STUDY-02 `friends-sheet`: over the Solo screen, which keeps running.
export function FriendsStudyingSheet({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rows = useStudyingFriends();
  const now = useNow();
  return (
    <BottomSheet
      visible={visible}
      title={t('friends.studying.title')}
      titleRight={
        <Text variant="label" color="text-secondary">
          {t('friends.studying.count', { count: rows.length })}
        </Text>
      }
      onDismiss={onDismiss}
    >
      {rows.map(({ r, activity }) => {
        const name = nameOf(r.user);
        return (
          <View
            key={r.user.id}
            style={[styles.row, { borderBottomColor: colors.border }]}
          >
            <Avatar name={name} uri={r.user.avatar?.['128']} size={32} />
            <View style={styles.info}>
              <Text weight="600" numberOfLines={1}>
                {name}
              </Text>
              <Where activity={activity} now={now} />
            </View>
            {/* ponytail: "Vào" joins the room with voice, P3-B1 (#26); hidden until then. */}
          </View>
        );
      })}
    </BottomSheet>
  );
}

function Where({ activity, now }: { activity: StudyActivity; now: number }) {
  const { t } = useTranslation();
  if (activity.kind === 'solo')
    return (
      <Text variant="label" color="text-secondary">
        {t('friends.studying.solo')}
      </Text>
    );
  const room = activity.kind === 'group_study' ? activity.room : null;
  if (!room)
    return (
      <Text variant="label" color="text-secondary">
        {t('friends.studying.group')}
      </Text>
    );
  const minutes = room.phase_ends_at
    ? Math.max(0, Math.floor((Date.parse(room.phase_ends_at) - now) / 60_000))
    : null;
  return (
    <>
      {room.state === 'paused' ? (
        <PhaseBadge
          phase={room.phase}
          state="paused"
          size="S"
          label={t('study.phase.pausedShort')}
        />
      ) : (
        <PhaseBadge
          phase={room.phase}
          size="S"
          label={t('friends.studying.phase', {
            phase: t(`study.phase.${room.phase}`),
          })}
          time={
            minutes === null
              ? undefined
              : `${minutes} ${t('friends.studying.minutes')}`
          }
        />
      )}
      <Text variant="label" color="text-secondary" numberOfLines={1}>
        {room.channel_name}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    alignSelf: 'center',
    minHeight: 48,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, minWidth: 0, gap: 2 },
});
