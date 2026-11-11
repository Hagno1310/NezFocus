import { checkPassword } from '@nezfocus/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock3, Mail } from 'lucide-react-native';
import { useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, StyleSheet, View, type TextInput } from 'react-native';
import type { RootStackParamList } from '../../../app/navigation/RootNavigator';
import {
  CODE_LENGTH,
  countdownText,
  secondsLeft,
  type CodeErrorState,
} from '../../../domain/auth/authFlow';
import type { PasswordError } from '../../../domain/auth/completeAccount';
import { resetFormErrors } from '../../../domain/auth/resetPassword';
import { size, space } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { CodeInput } from '../../../shared/ui/CodeInput';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { PasswordRules } from '../../../shared/ui/PasswordRules';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { useAuthFlow } from '../authFlowStore';
import {
  codeErrorMessage,
  needsNewCode as isCodeGone,
  passwordErrorKey,
} from '../codeMessages';
import { AuthScreen, InlineLink } from '../components/AuthScreen';
import { breakableEmail } from '../format';
import {
  showErrorToast,
  useResetPassword,
  useSendCode,
} from '../hooks/useAuthActions';
import { useNow, useOnline } from '../hooks/useAuthForm';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

const HOUR_SECONDS = 60 * 60;

// S-AUTH-05 `reset-form`: the code and the new password on one screen (CR-16). The code
// does not send itself; the new password survives every code error (AUTH-08 AC3b).
export function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { t } = useTranslation();
  const online = useOnline();
  const codeInput = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordInput = useRef<ComponentRef<typeof TextInput>>(null);
  const resendAt = useAuthFlow((s) =>
    s.resetCode?.email === email ? s.resetCode.resendAt : 0,
  );
  // "Gửi lại mã" can hit the 3-an-hour limit too (AC5).
  const [limitedUntil, setLimitedUntil] = useState(0);
  const now = useNow(Math.max(resendAt, limitedUntil));
  const wait = secondsLeft(resendAt, now);
  const limitWait = secondsLeft(limitedUntil, now);

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [passwordError, setPasswordError] = useState<PasswordError | null>(
    null,
  );
  const [codeError, setCodeError] = useState<CodeErrorState | null>(null);
  // too-many-attempts / code-expired: the code is gone, only a new one helps.
  const needsNewCode = isCodeGone(codeError);

  const resetter = useResetPassword();
  const busy = resetter.pending;
  const submit = async () => {
    const errors = resetFormErrors({ email, code, password });
    setSubmitted(true);
    setPasswordError(errors.password ?? null);
    if (errors.code) {
      codeInput.current?.focus();
      return;
    }
    Keyboard.dismiss();
    if (errors.password) return;
    const result = await resetter.run({ email, code, password });
    if (!result || result.ok) return;
    const { error } = result;
    if (error.kind === 'password') setPasswordError(error.error);
    else if (error.kind === 'network' || error.kind === 'other')
      showErrorToast(error.kind);
    else setCodeError(error);
  };

  const sender = useSendCode('reset_password');
  const resend = async () => {
    const result = await sender.run(email, true);
    if (!result) return;
    if (result.ok) {
      setCode('');
      setCodeError(null);
      showToast({ icon: Mail, message: t('auth.forgot.resent', { email }) });
      return;
    }
    const { error } = result;
    if (error.kind === 'rate-limited')
      setLimitedUntil(Date.now() + (error.retryAfter ?? HOUR_SECONDS) * 1000);
    else if (error.kind === 'network' || error.kind === 'other')
      showErrorToast(error.kind);
    // 'wait': the store already restarted the countdown.
  };

  const message = !online
    ? { tone: 'info' as const, text: t('auth.forgot.offline') }
    : (codeErrorMessage(t, codeError) ??
      (limitWait > 0
        ? {
            tone: 'info' as const,
            icon: Clock3,
            text: t('auth.forgot.rateLimited', {
              count: Math.ceil(limitWait / 60),
            }),
          }
        : null));

  return (
    <AuthScreen
      title={t('auth.forgot.resetTitle')}
      onBack={navigation.goBack}
      banner={!online && <SystemBanner kind="offline" />}
    >
      <View style={styles.sentTo}>
        <Text color="text-secondary">
          {t('auth.forgot.sentTo', { email: breakableEmail(email) })}
        </Text>
        <InlineLink
          center={false}
          size="label"
          link={t('auth.enterCode.changeEmail')}
          onPress={navigation.goBack}
        />
      </View>
      <View style={styles.field}>
        <Text variant="label" weight="600" color="text-secondary">
          {t('auth.forgot.code')}
        </Text>
        <CodeInput
          ref={codeInput}
          value={code}
          onChange={(next) => {
            setCode(next);
            if (codeError?.kind === 'code-wrong') setCodeError(null);
            if (next.length === CODE_LENGTH) passwordInput.current?.focus();
          }}
          error={codeError?.kind === 'code-wrong'}
          verifying={busy}
          disabled={!online || needsNewCode}
          autoFocus={false}
        />
      </View>
      <View style={styles.field}>
        <TextField
          ref={passwordInput}
          label={t('auth.forgot.newPassword')}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setPasswordError(null);
          }}
          password
          error={passwordError && t(passwordErrorKey[passwordError])}
          readonly={busy}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        <PasswordRules
          issues={checkPassword(password).filter(
            (i) => i !== 'SAME_AS_PERSONAL_INFO',
          )}
          submitted={submitted && passwordError === 'rules'}
        />
      </View>
      <Text variant="label" color="text-tertiary">
        {t('auth.forgot.othersSignedOut')}
      </Text>
      {message && <FormMessage {...message} />}
      <Button
        size="L"
        fullWidth
        label={t('auth.forgot.submit')}
        loading={busy}
        disabled={!online || needsNewCode}
        onPress={() => void submit()}
      />
      {needsNewCode && (
        <Button
          size="L"
          variant="secondary"
          fullWidth
          label={t('auth.enterCode.sendNew')}
          loading={sender.pending}
          disabled={!online || limitWait > 0 || wait > 0}
          onPress={() => void resend()}
        />
      )}
      {(!needsNewCode || wait > 0) && (
        <InlineLink
          center={false}
          prefix={t('auth.enterCode.noCode')}
          link={
            wait > 0
              ? t('auth.enterCode.resendIn', { time: countdownText(wait) })
              : t('auth.enterCode.resend')
          }
          disabled={!online || wait > 0 || limitWait > 0 || sender.pending}
          onPress={() => void resend()}
        />
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  field: { gap: size.iconGap },
  sentTo: { gap: space[2] },
});
