import { Check } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  searchTimeZones,
  type TimeZoneOption,
} from '../../../domain/auth/timeZones';
import { size, space } from '../../../shared/theme';
import { Icon } from '../../../shared/ui/Icon';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { Text } from '../../../shared/ui/Text';
import { SearchField } from '../../../shared/ui/TextField';

// S-ONB-01 › timezone-picker: "Theo máy" first (✓ only there while following the phone),
// then every zone by GMT; search ignores accents.
export function TimeZoneSheet({
  visible,
  options,
  deviceLabel,
  value,
  onChange,
  onDismiss,
}: {
  visible: boolean;
  options: TimeZoneOption[];
  deviceLabel: string; // "GMT+7 · Hồ Chí Minh"
  value: string | null; // null = follow the phone
  onChange: (zone: string | null) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const found = useMemo(
    () => searchTimeZones(options, query),
    [options, query],
  );
  const pick = (zone: string | null) => {
    onChange(zone);
    setQuery('');
    onDismiss();
  };
  return (
    <BottomSheet
      visible={visible}
      title={t('auth.complete.pickTimeZone')}
      onDismiss={onDismiss}
    >
      <View style={styles.list}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('auth.complete.searchTimeZone')}
          autoCorrect={false}
        />
        {!query.trim() && (
          <Row
            label={t('auth.complete.device', { zone: deviceLabel })}
            selected={value === null}
            strong
            onPress={() => pick(null)}
          />
        )}
        {found.map((o) => (
          <Row
            key={o.id}
            label={o.label}
            selected={value === o.id}
            onPress={() => pick(o.id)}
          />
        ))}
        {found.length === 0 && (
          <Text color="text-secondary" style={styles.empty}>
            {t('auth.complete.noTimeZone')}
          </Text>
        )}
      </View>
    </BottomSheet>
  );
}

function Row({
  label,
  selected,
  strong = false,
  onPress,
}: {
  label: string;
  selected: boolean;
  strong?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.row}
    >
      <Text weight={strong ? '600' : '400'} style={styles.flex}>
        {label}
      </Text>
      {selected && <Icon as={Check} size="md" color="primary" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[1] },
  row: {
    minHeight: size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  flex: { flex: 1 },
  empty: { paddingVertical: space[4], textAlign: 'center' },
});
