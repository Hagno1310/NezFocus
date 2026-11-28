import { ErrorCode } from '@nezfocus/shared';
import { CircleCheck, Clock3 } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useOnOpen } from '../hooks/useOnOpen';
import { space, type ColorToken } from '../theme';
import type { IconComponent } from './Icon';
import { Button } from './Button';
import { FormMessage } from './FormMessage';
import { BottomSheet } from './Overlay';
import { Text } from './Text';
import { TextField } from './TextField';

type Failure = { code?: number; retry_after?: number | null };

// S-MOD-03 `password` (spec 10): transfer the Owner role, delete the account. Wrong → the
// field's error, text kept; the 5th wrong try (40029, shared with every password dialog)
// holds the button until Retry-After while "Quên mật khẩu?" stays usable (CR-16 #10, #12).
export function PasswordSheet({
  visible,
  title,
  body,
  icon,
  confirmLabel,
  children,
  resetDone = false,
  explain,
  onConfirm,
  onForgot,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  body: string;
  icon: { as: IconComponent; color: ColorToken };
  confirmLabel: string;
  children?: ReactNode; // 07 S-ME-03 `delete-confirm`: the "server chỉ có bạn" block
  // `password-reset-done`: back from the code mode of Đổi mật khẩu after a new password.
  resetDone?: boolean;
  // The caller's own sentence for an error it knows (40401 "Bình không còn trong server").
  explain?: (err: unknown) => string | null;
  onConfirm: (password: string) => Promise<void>;
  onForgot: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Retry-After of the 40029: the button holds until then, the sentence says the minutes.
  const [wait, setWait] = useState<{
    until: number;
    count: number;
    unit: 'seconds' | 'minutes';
  } | null>(null);
  const [busy, setBusy] = useState(false);
  useOnOpen(visible, () => {
    setPassword('');
    setFieldError(null);
    setError(null);
  });
  // The button comes back by itself when the wait is over.
  useEffect(() => {
    if (wait === null) return;
    const timer = setTimeout(
      () => setWait(null),
      Math.max(0, wait.until - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [wait]);

  const submit = async () => {
    if (!password) {
      setFieldError(t('confirm.passwordEmpty'));
      return;
    }
    setBusy(true);
    setFieldError(null);
    setError(null);
    try {
      await onConfirm(password);
    } catch (err) {
      const f = err as Failure;
      const own = explain?.(err);
      if (own) setError(own);
      else if (f.code === ErrorCode.InvalidCredentials)
        setFieldError(t('confirm.passwordWrong'));
      else if (f.code === ErrorCode.RateLimited) {
        const seconds = f.retry_after ?? 600;
        // S-MOD-04 rounding: seconds under 60, else minutes rounded up.
        setWait({
          until: Date.now() + seconds * 1000,
          count: seconds < 60 ? seconds : Math.ceil(seconds / 60),
          unit: seconds < 60 ? 'seconds' : 'minutes',
        });
      } else setError(t('confirm.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={title}
      icon={icon}
      error={error}
      action={{
        label: confirmLabel,
        variant: 'danger',
        disabled: wait !== null,
        loading: busy,
        onPress: () => void submit(),
      }}
      secondary={{
        label: t('ui.cancel'),
        disabled: busy,
        onPress: onDismiss,
      }}
      onDismiss={onDismiss}
    >
      <View style={styles.body}>
        <Text color="text-secondary">{body}</Text>
        {children}
        <View>
          <TextField
            label={t('confirm.passwordLabel')}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setFieldError(null);
            }}
            placeholder={t('confirm.passwordPlaceholder')}
            password
            autoFocus={resetDone}
            error={fieldError}
            readonly={busy}
            onSubmitEditing={() => void submit()}
          />
          <View style={styles.forgot}>
            <Button
              variant="text"
              size="S"
              label={t('confirm.forgot')}
              disabled={busy}
              onPress={onForgot}
            />
          </View>
        </View>
        {wait !== null && (
          <FormMessage
            tone="info"
            icon={Clock3}
            text={t(
              wait.unit === 'seconds'
                ? 'confirm.rateLimitedSeconds'
                : 'confirm.rateLimited',
              { count: wait.count },
            )}
          />
        )}
        {resetDone && wait === null && !error && !fieldError && (
          <FormMessage
            tone="info"
            icon={CircleCheck}
            text={t('confirm.resetDone')}
          />
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3] },
  forgot: { alignItems: 'flex-end' },
});
