import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Clock3 } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, type TextInput } from 'react-native';
import type { RootStackParamList } from '../../../app/navigation/RootNavigator';
import { checkEmail } from '../../../domain/auth/authFlow';
import { Button } from '../../../shared/ui/Button';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { sendCode } from '../authFlowStore';
import { AuthScreen, InlineLink } from '../components/AuthScreen';
import { showErrorToast, useOnline, useSubmit } from '../hooks/useAuthForm';

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

  const submit = useSubmit(async () => {
    const checked = checkEmail(email);
    if ('error' in checked) {
      setFieldError(checked.error);
      Keyboard.dismiss();
      return;
    }
    const result = await sendCode(checked.email);
    if (result.ok || result.error.kind === 'wait') {
      navigation.navigate('EnterCode', {
        email: checked.email,
        from: 'create',
      });
      return;
    }
    const { kind } = result.error;
    if (kind === 'invalid-email') setFieldError('invalid');
    else if (kind === 'rate-limited') setLimitedEmail(email);
    else showErrorToast(kind);
  });

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
        readonly={submit.pending}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="done"
        onSubmitEditing={() => void submit.run()}
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
        loading={submit.pending}
        disabled={!online || limited}
        onPress={() => void submit.run()}
      />
      <InlineLink
        prefix={t('auth.createAccount.haveAccount')}
        link={t('auth.createAccount.signIn')}
        onPress={() => navigation.navigate('SignIn', {})}
      />
    </AuthScreen>
  );
}
