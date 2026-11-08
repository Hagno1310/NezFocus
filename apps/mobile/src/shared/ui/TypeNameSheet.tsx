import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { space } from '../theme';
import { typedNameMatches } from './logic';
import { BottomSheet } from './Overlay';
import { Text } from './Text';
import { TextField } from './TextField';

// S-MOD-03 `type-name` (spec 10): the danger button stays disabled until the typed text
// matches `name` (case, accents, extra spaces ignored). `submitting` locks Hủy, drag and Back.
export function TypeNameSheet({
  visible,
  title,
  body,
  label,
  name,
  confirmLabel,
  submitting,
  error,
  onConfirm,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  body: string;
  label: string; // "Nhập tên kênh để xác nhận"
  name: string; // the placeholder and what must be typed
  confirmLabel: string;
  submitting: boolean;
  error?: string | null; // `error`: FormMessage above the button
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');
  // Each opening starts empty.
  const [shown, setShown] = useState(visible);
  if (visible !== shown) {
    setShown(visible);
    if (visible) setTyped('');
  }
  return (
    <BottomSheet
      visible={visible}
      title={title}
      icon={{ as: Trash2, color: 'danger' }}
      error={error}
      action={{
        label: confirmLabel,
        variant: 'danger',
        disabled: !typedNameMatches(typed, name),
        loading: submitting,
        onPress: onConfirm,
      }}
      secondary={{
        label: t('ui.cancel'),
        disabled: submitting,
        onPress: onDismiss,
      }}
      onDismiss={onDismiss}
    >
      <View style={styles.body}>
        <Text color="text-secondary">{body}</Text>
        <TextField
          label={label}
          value={typed}
          onChangeText={setTyped}
          placeholder={name}
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
          readonly={submitting}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3] },
});
