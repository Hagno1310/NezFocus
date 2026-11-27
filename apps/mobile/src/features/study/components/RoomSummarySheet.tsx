import type { FocusSessionEnd } from '@nezfocus/shared';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { summaryOf } from '../../../domain/study/roomView';
import { size, space } from '../../../shared/theme';
import { Mascot } from '../../../shared/ui/Mascot';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { Text } from '../../../shared/ui/Text';
import { useStudyStats } from '../hooks/useStudyStats';

// S-ROOM-EDGE `host-stopped`, `ended-self-host`, `ended-focus-off` (CR-22): everyone's own
// summary; under a minute shows no number and no mascot.
export function RoomSummarySheet({
  end,
  meId,
  nameOf,
  onStay,
  onLeave,
}: {
  end: FocusSessionEnd | null;
  meId: string;
  nameOf: (userId: string) => string;
  onStay: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const stats = useStudyStats('week').data;
  const summary = end && summaryOf(end, meId);
  const reason =
    summary &&
    (summary.reason.key === 'stoppedByMe'
      ? t('room.summary.stoppedByMe')
      : summary.reason.key === 'empty'
        ? null
        : t(`room.summary.${summary.reason.key}`, {
            name: nameOf(summary.reason.by),
          }));
  return (
    <BottomSheet
      visible={!!summary}
      onDismiss={onStay}
      action={{ label: t('room.summary.stay'), onPress: onStay }}
      secondary={{
        label: t('room.summary.leave'),
        variant: 'text',
        onPress: onLeave,
      }}
    >
      {summary && (
        <View style={styles.body}>
          {/* A moment to celebrate, outside a focus phase (DESIGN.md › Mascot). */}
          {summary.minutes !== null && (
            <Mascot mood="happy" size={size.mascotSummary} />
          )}
          <Text variant="title-2" style={styles.center}>
            {t('room.summary.title')}
          </Text>
          {reason && (
            <Text color="text-secondary" style={styles.center}>
              {reason}
            </Text>
          )}
          {summary.minutes === null ? (
            <Text style={styles.center}>{t('room.summary.tooShort')}</Text>
          ) : (
            <View style={styles.minutes}>
              <Text variant="stat">{summary.minutes}</Text>
              <Text>{t('room.summary.minutes')}</Text>
            </View>
          )}
          {stats && (
            <Text variant="label" color="text-secondary" style={styles.center}>
              {t('room.summary.today', {
                minutes: stats.today_minutes,
                days: stats.current_streak_days,
              })}
            </Text>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: space[2], paddingBottom: space[2] },
  center: { textAlign: 'center' },
  minutes: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
});
