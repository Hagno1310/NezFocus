import { ClipboardPaste, Info, WifiOff } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LookupError } from '../../../domain/invites/joinInvite';
import { space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Icon } from '../../../shared/ui/Icon';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { useOnline } from '../../gateway/hooks/useOnline';
import { useLookupInvite } from '../hooks/useInvitePreview';

const ERROR_TEXT = {
  'bad-format': 'invites.badFormat',
  invalid: 'invites.invalid',
  'rate-limited': 'invites.tooMany',
  network: 'invites.lookupFailed',
  other: 'invites.lookupFailed',
} as const satisfies Record<LookupError, string>;

// S-HOME-06 `join-by-code` / `join-error` / `keyboard-open · code` / `offline` (spec 02).
export function JoinByCodeScreen({
  onBack,
  onFound,
}: {
  onBack: () => void;
  onFound: (code: string, channelId?: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const online = useOnline();
  const lookup = useLookupInvite();
  const [text, setText] = useState('');
  const [error, setError] = useState<LookupError | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (pending || !online) return;
    setPending(true);
    const result = await lookup(text);
    setPending(false);
    if (!result.ok) return setError(result.error);
    setError(null);
    onFound(result.code, result.channelId);
  };

  // SRV-07: the clipboard is read only when "Dán" is pressed.
  const paste = async () => {
    const value = await Clipboard.getStringAsync();
    if (!value) return;
    setText(value.trim());
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      <ScreenHeader title={t('invites.joinTitle')} onBack={onBack} />
      <ScrollView
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.body,
          { paddingBottom: bottom + space[3] },
        ]}
      >
        <Text color="text-secondary">{t('invites.joinIntro')}</Text>
        <TextField
          label={t('invites.codeLabel')}
          placeholder={t('invites.codePlaceholder')}
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (error) setError(null);
          }}
          error={error ? t(ERROR_TEXT[error]) : null}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => void submit()}
          mono
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('invites.paste')}
              hitSlop={12}
              onPress={() => void paste()}
              style={styles.paste}
            >
              <Icon as={ClipboardPaste} size="sm" color="primary" />
              <Text variant="body-sm" weight="600" color="primary">
                {t('invites.paste')}
              </Text>
            </Pressable>
          }
        />
        {!error && (
          <View style={styles.hint}>
            <Icon as={Info} size="sm" color="text-secondary" />
            <Text variant="label" color="text-secondary" style={styles.flex}>
              {t('invites.codeHint')}
            </Text>
          </View>
        )}
        <View style={styles.flex} />
        {!online && (
          <View style={styles.hint}>
            <Icon as={WifiOff} size="sm" color="text-secondary" />
            <Text variant="label" color="text-secondary" style={styles.flex}>
              {t('invites.joinOffline')}
            </Text>
          </View>
        )}
        <Button
          size="L"
          fullWidth
          label={t('invites.continue')}
          loading={pending}
          disabled={!online}
          onPress={() => void submit()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    flexGrow: 1,
    gap: space[2] + space[1],
    paddingTop: space[2],
    paddingHorizontal: space[3],
  },
  paste: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
});
