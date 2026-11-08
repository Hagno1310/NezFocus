import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock3, LoaderCircle } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, StyleSheet, View } from 'react-native';
import type { RootStackParamList } from '../../../app/navigation/RootNavigator';
import { authRepository } from '../../../data/auth';
import {
  codeErrorState,
  countdownText,
  secondsLeft,
  type CodeErrorState,
} from '../../../domain/auth/authFlow';
import { space } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { CodeInput } from '../../../shared/ui/CodeInput';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Text } from '../../../shared/ui/Text';
import {
  finishSignIn,
  sendCode,
  showResentToast,
  useAuthFlow,
} from '../authFlowStore';
import { AuthScreen, InlineLink } from '../components/AuthScreen';
import {
  showErrorToast,
  useNow,
  useOnline,
  useSubmit,
} from '../hooks/useAuthForm';

type Props = NativeStackScreenProps<RootStackParamList, 'EnterCode'>;

// C-02 › Ngắt dòng: a long email breaks only after "@" or "." (zero-width spaces there).
const breakable = (email: string) => email.replace(/([@.])/g, '$1​');

// S-AUTH-03: one screen for sign-up and OTP sign-in. Nothing is stored locally: a killed app
// reopens on S-AUTH-01 (AUTH-13).
export function EnterCodeScreen({ navigation, route }: Props) {
  const { email, from } = route.params;
  const { t } = useTranslation();
  const online = useOnline();
  const resendAt = useAuthFlow((s) =>
    s.sentCode?.email === email ? s.sentCode.resendAt : 0,
  );
  const now = useNow(resendAt);
  const wait = secondsLeft(resendAt, now);
  const [code, setCode] = useState('');
  const [error, setError] = useState<CodeErrorState | null>(null);
  // rate-limited: 10 codes today; the code already sent can still be entered (AUTH-13 AC6).
  const [resendBlocked, setResendBlocked] = useState(false);

  const verify = useSubmit(async (value: string) => {
    try {
      const session = await authRepository.verifyEmailCode(email, value);
      finishSignIn(session.user, 'otp', {
        fromCreateAccount: from === 'create',
      });
    } catch (err) {
      const state = codeErrorState(err);
      if (state.kind === 'other') {
        showErrorToast('other');
        setCode('');
        return;
      }
      if (state.kind === 'network') Keyboard.dismiss();
      setError(state);
    }
  });

  const resend = useSubmit(async () => {
    const result = await sendCode(email, { force: true });
    if (result.ok) {
      setCode('');
      setError(null);
      showResentToast(email);
      return;
    }
    const { kind } = result.error;
    if (kind === 'rate-limited') setResendBlocked(true);
    else if (kind === 'network' || kind === 'other') showErrorToast(kind);
  });

  // too-many-attempts / code-expired: the code is gone, only a new one helps.
  const needsNewCode =
    error?.kind === 'too-many-attempts' || error?.kind === 'code-expired';
  const message = !online
    ? { tone: 'info' as const, text: t('auth.enterCode.offline') }
    : verify.pending
      ? {
          tone: 'info' as const,
          icon: LoaderCircle,
          text: t('auth.enterCode.verifying'),
        }
      : error?.kind === 'code-wrong'
        ? {
            tone: 'error' as const,
            text: t('auth.enterCode.wrong', { count: error.attemptsLeft }),
          }
        : error?.kind === 'too-many-attempts'
          ? { tone: 'error' as const, text: t('auth.enterCode.tooMany') }
          : error?.kind === 'code-expired'
            ? { tone: 'error' as const, text: t('auth.enterCode.expired') }
            : error?.kind === 'network'
              ? {
                  tone: 'error' as const,
                  text: t('auth.enterCode.networkError'),
                }
              : resendBlocked
                ? {
                    tone: 'info' as const,
                    icon: Clock3,
                    text: t('auth.enterCode.rateLimited'),
                  }
                : null;

  return (
    <AuthScreen
      title={t('auth.enterCode.title')}
      onBack={navigation.goBack}
      banner={!online && <SystemBanner kind="offline" />}
    >
      <View>
        <Text color="text-secondary">{t('auth.enterCode.sentTo')}</Text>
        <Text weight="600">{breakable(email)}</Text>
        <InlineLink
          center={false}
          link={t('auth.enterCode.changeEmail')}
          onPress={navigation.goBack}
        />
      </View>
      <CodeInput
        value={code}
        onChange={(next) => {
          setCode(next);
          if (error?.kind === 'code-wrong' || error?.kind === 'network')
            setError(null);
        }}
        onComplete={(full) => void verify.run(full)}
        error={error?.kind === 'code-wrong'}
        verifying={verify.pending}
        disabled={!online || needsNewCode}
      />
      {message && <FormMessage {...message} />}
      {error?.kind === 'network' && (
        <Button
          size="L"
          variant="secondary"
          fullWidth
          label={t('auth.enterCode.retry')}
          loading={verify.pending}
          onPress={() => void verify.run(code)}
        />
      )}
      {needsNewCode && (
        <Button
          size="L"
          variant="secondary"
          fullWidth
          label={t('auth.enterCode.sendNew')}
          loading={resend.pending}
          disabled={!online || resendBlocked || wait > 0}
          onPress={() => void resend.run()}
        />
      )}
      <Text variant="label" color="text-tertiary">
        {t('auth.enterCode.hint')}
      </Text>
      {(!needsNewCode || wait > 0) && (
        <InlineLink
          center={false}
          prefix={t('auth.enterCode.noCode')}
          link={
            wait > 0
              ? t('auth.enterCode.resendIn', { time: countdownText(wait) })
              : t('auth.enterCode.resend')
          }
          disabled={!online || wait > 0 || resendBlocked || resend.pending}
          onPress={() => void resend.run()}
        />
      )}
      <View style={styles.gapTop}>
        <InlineLink
          center={false}
          link={t('auth.enterCode.usePassword')}
          onPress={() =>
            navigation.popTo('SignIn', { mode: 'password', email })
          }
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({ gapTop: { marginTop: space[2] } });
