import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { space } from '../../../shared/theme';
import { EmptyState } from '../../../shared/ui/Feedback';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { RoomRows } from '../components/RoomRows';
import { useActiveRooms } from '../hooks/useActiveRooms';

// S-STUDY-06: every room of "Đang học lúc này", same rows and order as S-STUDY-01, no limit.
export function ActiveRoomsScreen({
  onBack,
  onShowRoom,
}: {
  onBack: () => void;
  onShowRoom: () => void;
}) {
  const { t } = useTranslation();
  const { rows } = useActiveRooms();
  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('study.home.rooms')} onBack={onBack} />
      {rows.length === 0 ? (
        // `all-ended`.
        <EmptyState
          title={t('study.home.allEndedTitle')}
          body={t('study.home.allEndedBody')}
          action={{
            label: t('study.home.backToStudy'),
            variant: 'secondary',
            onPress: onBack,
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text variant="label" color="text-secondary">
            {t('study.home.roomsCount', { n: rows.length })}
          </Text>
          <RoomRows rows={rows} onShowRoom={onShowRoom} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { paddingHorizontal: space[3], paddingTop: space[2] },
});
