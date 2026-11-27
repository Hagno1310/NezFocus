import type { FocusPhase } from '@nezfocus/shared';
import {
  SkipForward,
  SlidersHorizontal,
  Square,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { size, space, useTheme } from '../../../shared/theme';
import { Icon } from '../../../shared/ui/Icon';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { Text } from '../../../shared/ui/Text';

// S-ROOM-04: Bỏ qua pha · Sửa chu kỳ · Dừng phiên học. `moderator`: MANAGE_STUDY_ROOMS, not Host.
export function RoomControlSheet({
  visible,
  next,
  people,
  host,
  onSkip,
  onEdit,
  onStop,
  onDismiss,
}: {
  visible: boolean;
  next: FocusPhase; // the phase "Bỏ qua pha" goes to
  people: number;
  host: string | null; // the Host's name when it is not me
  onSkip: () => void;
  onEdit: () => void;
  onStop: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  return (
    <BottomSheet
      visible={visible}
      title={t('room.controls.title')}
      onDismiss={onDismiss}
    >
      {host && (
        <Text color="text-secondary" style={styles.note}>
          {t('room.controls.moderator', { name: host })}
        </Text>
      )}
      <Row
        icon={SkipForward}
        label={t('room.controls.skip')}
        note={t(`room.controls.skipTo.${next}`)}
        onPress={onSkip}
      />
      <Row
        icon={SlidersHorizontal}
        label={t('room.controls.edit')}
        note={t('room.controls.editNote')}
        onPress={onEdit}
      />
      <Row
        icon={Square}
        label={t('room.controls.stop')}
        note={t('room.controls.stopNote', { n: people })}
        danger
        onPress={onStop}
      />
    </BottomSheet>
  );
}

function Row({
  icon,
  label,
  note,
  danger = false,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  note: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${note}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors['overlay-pressed'] },
      ]}
    >
      <Icon as={icon} size="lg" color={danger ? 'danger' : 'text-secondary'} />
      <View style={styles.flex}>
        <Text weight="600" color={danger ? 'danger' : 'text-primary'}>
          {label}
        </Text>
        <Text variant="label" color="text-secondary">
          {note}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: { paddingBottom: space[2] },
  row: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[2],
  },
  flex: { flex: 1 },
});
