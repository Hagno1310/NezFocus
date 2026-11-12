import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Clock3,
  KeyRound,
  LogOut,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, StyleSheet, View, type TextInput } from 'react-native';
import { useStore } from 'zustand';
import type { RootStackParamList } from '../../../app/navigation/RootNavigator';
import {
  checkEmail,
  secondsLeft,
  signInModeAfterEnd,
  type SignInMode,
} from '../../../domain/auth/authFlow';
import {
  sessionStore,
  type EndReason,
} from '../../../domain/session/sessionStore';
import { space } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Banner, SystemBanner } from '../../../shared/ui/Feedback';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { useAuthFlow } from '../authFlowStore';
import { AuthScreen, InlineLink, OrDivider } from '../components/AuthScreen';
import {
  showErrorToast,
  useEmailCodeStep,
  useLogIn,
} from '../hooks/useAuthActions';
import { useNow, useOnline } from '../hooks/useAuthForm';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

// Spec 01 › Phiên đăng nhập kết thúc: one banner per reason.
const endedIcon: Record<EndReason, LucideIcon> = {
  password_reset: KeyRound,
  revoked: LogOut,
  reuse_detected: ShieldAlert,
  expired: Clock3,
};

// S-AUTH-04: OTP mode (default on a new phone) and password mode; opens the way of the last
// successful sign-in on this phone (AUTH-02 AC6). Switching keeps the email.
export function SignInScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const online = useOnline();
  const ended = useStore(sessionStore, (s) => s.ended);
  const lastMethod = useAuthFlow((s) => s.lastMethod);
  const emailInput = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordInput = useRef<ComponentRef<typeof TextInput>>(null);

  const [mode, setMode] = useState<SignInMode>(
    () =>
      route.params?.mode ??
      (ended
        ? signInModeAfterEnd(ended.reason, lastMethod)
        : (lastMethod ?? 'otp')),
  );
  const [email, setEmail] = useState(
    () => route.params?.email ?? ended?.user?.email ?? '',
  );
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<'empty' | 'invalid' | null>(
    null,
  );
  const [wrongPassword, setWrongPassword] = useState(false);
  // Both limits stick to the email they were hit with: editing the email enables the button.
  const [loginLimit, setLoginLimit] = useState<{
    email: string;
    until: number;
  } | null>(null);
  const [otpLimitedEmail, setOtpLimitedEmail] = useState<string | null>(null);
  const now = useNow(loginLimit?.until ?? 0);
  const loginWait =
    loginLimit?.email === email ? secondsLeft(loginLimit.until, now) : 0;
  const otpLimited = otpLimitedEmail !== null && otpLimitedEmail === email;

  // "Đăng nhập bằng mật khẩu" on S-AUTH-03 comes back here with new params.
  const [seenParams, setSeenParams] = useState(route.params);
  if (route.params !== seenParams) {
    setSeenParams(route.params);
    if (route.params?.mode) setMode(route.params.mode);
    if (route.params?.email) setEmail(route.params.email);
  }

  const clearErrors = () => {
    setEmailError(null);
    setWrongPassword(false);
  };

  const switchMode = () => {
    const next = mode === 'otp' ? 'password' : 'otp';
    clearErrors();
    setMode(next);
    // Focus the first empty field of the new mode.
    requestAnimationFrame(() =>
      (next === 'password' && email
        ? passwordInput
        : emailInput
      ).current?.focus(),
    );
  };

  const loginMutation = useLogIn();
  const login = {
    pending: loginMutation.pending,
    run: async () => {
      const checked = checkEmail(email);
      if ('error' in checked) {
        setEmailError(checked.error);
        Keyboard.dismiss();
        return;
      }
      if (!password) {
        passwordInput.current?.focus();
        return;
      }
      const result = await loginMutation.run(checked.email, password);
      if (!result || result.ok) return;
      const state = result.error;
      if (state.kind === 'wrong-password') {
        setWrongPassword(true);
        setPassword('');
      } else if (state.kind === 'rate-limited')
        setLoginLimit({ email, until: state.until });
      else if (state.kind === 'invalid-email') setEmailError('invalid');
      else showErrorToast(state.kind);
    },
  };

  const otpStep = useEmailCodeStep({
    sent: (valid) =>
      navigation.navigate('EnterCode', { email: valid, from: 'signIn' }),
    fieldError: setEmailError,
    rateLimited: () => setOtpLimitedEmail(email),
  });
  const sendOtp = {
    pending: otpStep.pending,
    run: () => otpStep.start(email),
  };

  const busy = loginMutation.pending || otpStep.pending;
  const passwordMode = mode === 'password';

  const message = !online
    ? { tone: 'info' as const, text: t('auth.signIn.offline') }
    : passwordMode && loginWait > 0
      ? {
          tone: 'info' as const,
          icon: Clock3,
          text: t('auth.signIn.rateLimited', {
            count: Math.ceil(loginWait / 60),
          }),
        }
      : passwordMode && wrongPassword
        ? { tone: 'error' as const, text: t('auth.signIn.wrongPassword') }
        : !passwordMode && otpLimited
          ? {
              tone: 'info' as const,
              icon: Clock3,
              text: t('auth.signIn.otpRateLimited'),
            }
          : null;

  const banner = !online ? (
    <SystemBanner kind="offline" />
  ) : ended ? (
    <Banner
      icon={endedIcon[ended.reason]}
      text={t(`auth.ended.${ended.reason}`)}
    />
  ) : null;

  return (
    <AuthScreen
      title={t('auth.signIn.title')}
      onBack={() =>
        navigation.canGoBack()
          ? navigation.goBack()
          : navigation.replace('Welcome')
      }
      banner={banner}
    >
      {!passwordMode && (
        <Text color="text-secondary">{t('auth.signIn.otpBody')}</Text>
      )}
      <TextField
        ref={emailInput}
        label={t('auth.email.label')}
        placeholder={t('auth.email.placeholder')}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          clearErrors();
        }}
        error={emailError && t(`auth.email.${emailError}`)}
        readonly={busy}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType={passwordMode ? 'next' : 'done'}
        onSubmitEditing={() =>
          passwordMode ? passwordInput.current?.focus() : void sendOtp.run()
        }
      />
      {passwordMode && (
        <View style={styles.passwordBlock}>
          <TextField
            ref={passwordInput}
            label={t('auth.signIn.password')}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setWrongPassword(false);
            }}
            password
            readonly={busy}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={() => void login.run()}
          />
          <View style={styles.forgot}>
            <InlineLink
              size="label"
              link={t('auth.signIn.forgot')}
              onPress={() =>
                navigation.navigate('ForgotPassword', {
                  email: email.trim() || undefined,
                })
              }
            />
          </View>
        </View>
      )}
      {message && <FormMessage {...message} />}
      <Button
        size="L"
        fullWidth
        label={t(passwordMode ? 'auth.signIn.submit' : 'auth.signIn.sendCode')}
        loading={busy}
        disabled={!online || (passwordMode ? loginWait > 0 : otpLimited)}
        onPress={() => void (passwordMode ? login.run() : sendOtp.run())}
      />
      <OrDivider label={t('auth.signIn.or')} />
      <Button
        size="L"
        variant="secondary"
        fullWidth
        label={t(
          passwordMode ? 'auth.signIn.useOtp' : 'auth.signIn.usePassword',
        )}
        disabled={busy}
        onPress={switchMode}
      />
      <InlineLink
        prefix={t('auth.signIn.noAccount')}
        link={t('auth.signIn.createAccount')}
        onPress={() => navigation.navigate('CreateAccount')}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  passwordBlock: { gap: space[2] },
  forgot: { alignItems: 'flex-end' },
});
