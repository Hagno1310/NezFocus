import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock3 } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';
import type { RootStackParamList } from '../../../app/navigation/RootNavigator';
import { secondsLeft } from '../../../domain/auth/authFlow';
import { Button } from '../../../shared/ui/Button';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { AuthScreen } from '../components/AuthScreen';
import { useEmailCodeStep } from '../hooks/useAuthActions';
import { useNow, useOnline } from '../hooks/useAuthForm';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

const HOUR_SECONDS = 60 * 60;

// S-AUTH-05 `request`. Same sentences and limits whether the email has an account (AUTH-08
// AC2); back goes to S-AUTH-04 password mode, which still holds its email.
export function ForgotPasswordScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const online = useOnline();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [fieldError, setFieldError] = useState<'empty' | 'invalid' | null>(
    null,
  );
  // AC5: 3 an hour for this email; editing the email enables the button again.
  const [limit, setLimit] = useState<{ email: string; until: number } | null>(
    null,
  );
  const now = useNow(limit?.until ?? 0);
  const wait = limit?.email === email ? secondsLeft(limit.until, now) : 0;

  // Back from reset-form ("Đổi email" / back) keeps the text and reopens the keyboard.
  useEffect(() => {
    let first = true;
    return navigation.addListener('focus', () => {
      if (!first) input.current?.focus();
      first = false;
    });
  }, [navigation]);

  const step = useEmailCodeStep(
    {
      sent: (valid) => navigation.navigate('ResetPassword', { email: valid }),
      fieldError: setFieldError,
      rateLimited: (retryAfter) =>
        setLimit({
          email,
          until: Date.now() + (retryAfter ?? HOUR_SECONDS) * 1000,
        }),
    },
    'reset_password',
  );
  const submit = () => void step.start(email);

  return (
    <AuthScreen
      title={t('screens.forgotPassword')}
      onBack={navigation.goBack}
      banner={!online && <SystemBanner kind="offline" />}
    >
      <Text color="text-secondary">{t('auth.forgot.body')}</Text>
      <TextField
        ref={input}
        label={t('auth.email.label')}
        placeholder={t('auth.email.placeholder')}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setFieldError(null);
        }}
        error={fieldError && t(`auth.email.${fieldError}`)}
        readonly={step.pending}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {!online ? (
        <FormMessage tone="info" text={t('auth.forgot.offline')} />
      ) : wait > 0 ? (
        <FormMessage
          tone="info"
          icon={Clock3}
          text={t('auth.forgot.rateLimited', { count: Math.ceil(wait / 60) })}
        />
      ) : null}
      <Button
        size="L"
        fullWidth
        label={t('auth.signIn.sendCode')}
        loading={step.pending}
        disabled={!online || wait > 0}
        onPress={submit}
      />
    </AuthScreen>
  );
}
