import { TimerOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { roomSessionsStore } from '../../../domain/study/roomSessions';
import { enterRoom, openVoice } from '../../../domain/voice/voiceView';
import { motion, radius, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { PhaseBadge } from '../../../shared/ui/Focus';
import { AvatarStack } from '../../../shared/ui/People';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { hhmm } from '../format';
import type { RoomRowData } from '../hooks/useActiveRooms';
import { useSolo } from '../hooks/useSolo';

// S-STUDY-01 / S-STUDY-06 rows. Tap the row → the room's preview (`not-joined`); "Vào" → in,
// through S-ROOM-06 while a Solo runs. `onShowRoom` brings the Home tab up (the room is a Home root).
export function RoomRows({
  rows,
  onShowRoom,
}: {
  rows: RoomRowData[];
  onShowRoom: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const solo = useSolo();
  const join = (row: RoomRowData) => {
    const target = { serverId: row.serverId, channelId: row.channelId };
    const live = roomSessionsStore.getState();
    if (!live.byChannel[row.channelId]) {
      // S-STUDY-EDGE `room-ended-on-join`: in as a room without a session; a Solo runs on.
      const at = live.endedAt[row.channelId];
      if (at)
        showToast({
          icon: TimerOff,
          message: t(
            solo && solo.session.status !== 'ended'
              ? 'study.home.endedOnJoinSolo'
              : 'study.home.endedOnJoin',
            { time: hhmm(new Date(at)) },
          ),
        });
    }
    enterRoom(target);
    onShowRoom();
  };
  return (
    <View>
      {rows.map((row, i) => (
        <Animated.View
          key={row.channelId}
          // Spec 04: an ended room fades out and the rows below close up (`medium`).
          exiting={FadeOut.duration(motion.medium)}
          layout={LinearTransition.duration(motion.medium)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${row.name}, ${row.label}, ${row.line}`}
            onPress={() => {
              openVoice({ serverId: row.serverId, channelId: row.channelId });
              onShowRoom();
            }}
            style={({ pressed }) => [
              styles.row,
              i < rows.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
              pressed && { backgroundColor: colors['overlay-pressed'] },
            ]}
          >
            <View style={styles.text}>
              <PhaseBadge
                phase={row.phase}
                state={row.state}
                size="S"
                label={row.label}
              />
              <Text weight="600" numberOfLines={1}>
                {row.name}
              </Text>
              <View style={styles.people}>
                {row.friends.length > 0 && (
                  <AvatarStack people={row.friends} size={20} />
                )}
                <Text
                  variant="label"
                  color="text-secondary"
                  numberOfLines={1}
                  style={styles.shrink}
                >
                  {row.line}
                </Text>
              </View>
            </View>
            {row.mine ? (
              <View
                style={[styles.here, { backgroundColor: colors['surface-2'] }]}
              >
                <Text variant="label" weight="600" color="text-secondary">
                  {t('study.home.here')}
                </Text>
              </View>
            ) : (
              <Button
                variant="secondary"
                size="S"
                label={t('study.home.join')}
                onPress={() => join(row)}
              />
            )}
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
  },
  text: { flex: 1, gap: space[1] },
  people: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  shrink: { flexShrink: 1 },
  here: {
    borderRadius: radius.full,
    paddingHorizontal: space[2] + space[1],
    paddingVertical: space[1],
  },
});
