import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock3 } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';
import type { RootStackParamList } from '../../../app/navigation/RootNavigator';
import { Button } from '../../../shared/ui/Button';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { AuthScreen, InlineLink } from '../components/AuthScreen';
import { useEmailCodeStep } from '../hooks/useAuthActions';
import { useOnline } from '../hooks/useAuthForm';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAccount'>;

// S-AUTH-02: only the email. Same sentences whether the email has an account (AUTH-01 AC2b).
export function CreateAccountScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const online = useOnline();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<'empty' | 'invalid' | null>(
    null,
  );
  // rate-limited: 10 codes today for this email; editing the email enables the button again.
  const [limitedEmail, setLimitedEmail] = useState<string | null>(null);
  const limited = limitedEmail !== null && limitedEmail === email;

  // back-to-edit: back from S-AUTH-03 keeps the text and reopens the keyboard.
  useEffect(() => {
    let first = true;
    return navigation.addListener('focus', () => {
      if (!first) input.current?.focus();
      first = false;
    });
  }, [navigation]);

  const step = useEmailCodeStep({
    sent: (valid) =>
      navigation.navigate('EnterCode', { email: valid, from: 'create' }),
    fieldError: setFieldError,
    rateLimited: () => setLimitedEmail(email),
  });
  const submit = () => void step.start(email);

  return (
    <AuthScreen
      title={t('auth.createAccount.title')}
      onBack={navigation.goBack}
      banner={!online && <SystemBanner kind="offline" />}
    >
      <Text color="text-secondary">{t('auth.createAccount.body')}</Text>
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
        <FormMessage tone="info" text={t('auth.createAccount.offline')} />
      ) : limited ? (
        <FormMessage
          tone="info"
          icon={Clock3}
          text={t('auth.createAccount.rateLimited')}
        />
      ) : null}
      <Button
        size="L"
        fullWidth
        label={t('auth.createAccount.submit')}
        loading={step.pending}
        disabled={!online || limited}
        onPress={submit}
      />
      <InlineLink
        prefix={t('auth.createAccount.haveAccount')}
        link={t('auth.createAccount.signIn')}
        onPress={() => navigation.navigate('SignIn', {})}
      />
    </AuthScreen>
  );
}
