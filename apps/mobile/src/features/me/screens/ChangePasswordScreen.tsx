import { checkPassword } from '@nezfocus/shared';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { Clock3 } from 'lucide-react-native';
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type TextInput,
} from 'react-native';
import {
  CODE_LENGTH,
  countdownText,
  secondsLeft,
  type CodeErrorState,
} from '../../../domain/auth/authFlow';
import {
  changePasswordErrors,
  type ChangePasswordForm,
} from '../../../domain/account/changePassword';
import type { PasswordError } from '../../../domain/auth/completeAccount';
import { size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { CodeInput } from '../../../shared/ui/CodeInput';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Dialog } from '../../../shared/ui/Overlay';
import { PasswordRules } from '../../../shared/ui/PasswordRules';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { showToast } from '../../../shared/ui/Toast';
import { useAuthFlow } from '../../auth/authFlowStore';
import {
  codeErrorMessage,
  needsNewCode as isCodeGone,
  passwordErrorKey,
} from '../../auth/codeMessages';
import { InlineLink } from '../../auth/components/AuthScreen';
import { breakableEmail } from '../../auth/format';
import { showErrorToast, useSendCode } from '../../auth/hooks/useAuthActions';
import { useNow } from '../../auth/hooks/useAuthForm';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import { useChangePassword, useSessions } from '../hooks/useAccount';
import { useMe } from '../hooks/useMe';

const HOUR_SECONDS = 60 * 60;

// S-ME-03 Đổi mật khẩu: `password-form`, or `password-code` after "Quên mật khẩu?" (the
// AUTH-08 reset code, sent on entering). The new password survives every code error.
export function ChangePasswordScreen({
  initialMode = 'password',
  onBack,
  onSaved,
}: {
  initialMode?: 'password' | 'code';
  onBack: () => void;
  onSaved: (othersLoggedOut: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const online = useOnline();
  const me = useMe().data;
  const email = me?.email ?? '';
  const sessions = useSessions().data;
  const currentInput = useRef<ComponentRef<typeof TextInput>>(null);
  const codeInput = useRef<ComponentRef<typeof TextInput>>(null);
  const newInput = useRef<ComponentRef<typeof TextInput>>(null);

  const [mode, setMode] = useState(initialMode);
  const [current, setCurrent] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [currentError, setCurrentError] = useState(false);
  const [passwordError, setPasswordError] = useState<PasswordError | null>(
    null,
  );
  const [codeError, setCodeError] = useState<CodeErrorState | null>(null);
  // AC3: 5 wrong current passwords in 10 minutes; "Quên mật khẩu?" still works.
  const [lockedUntil, setLockedUntil] = useState(0);
  // The reset code's own limit (AUTH-08 AC5: 3 an hour).
  const [codeLimitedUntil, setCodeLimitedUntil] = useState(0);
  const resendAt = useAuthFlow((s) =>
    s.resetCode?.email === email ? s.resetCode.resendAt : 0,
  );
  const now = useNow(Math.max(lockedUntil, codeLimitedUntil, resendAt));
  const lockWait = secondsLeft(lockedUntil, now);
  const codeLimitWait = secondsLeft(codeLimitedUntil, now);
  const wait = secondsLeft(resendAt, now);
  const needsNewCode = isCodeGone(codeError);

  const sender = useSendCode('reset_password');
  type SendResult = Awaited<ReturnType<typeof sender.run>>;
  const onSent = (result: SendResult, force: boolean) => {
    if (!result) return;
    if (result.ok) {
      if (force) {
        setCode('');
        setCodeError(null);
      }
      return;
    }
    const { error } = result;
    if (error.kind === 'rate-limited')
      setCodeLimitedUntil(
        Date.now() + (error.retryAfter ?? HOUR_SECONDS) * 1000,
      );
    else if (error.kind === 'network' || error.kind === 'other')
      showErrorToast(error.kind);
  };
  const sendCode = (force: boolean) =>
    email ? sender.run(email, force).then((r) => onSent(r, force)) : null;

  // `password-code` opened directly (S-MOD-03 "Quên mật khẩu?") sends the code once.
  const onSentOnOpen = useEffectEvent((r: SendResult) => onSent(r, false));
  const { run: sendOnce } = sender;
  useEffect(() => {
    if (initialMode === 'code' && email)
      void sendOnce(email, false).then((r) => onSentOnOpen(r));
  }, [initialMode, email, sendOnce]);

  const enterCodeMode = () => {
    setMode('code');
    setCurrentError(false);
    void sendCode(false);
  };

  const saver = useChangePassword({
    email,
    username: me?.username ?? null,
  });
  const busy = saver.pending;
  const [savedOthers, setSavedOthers] = useState<number | null>(null);
  const save = async () => {
    const form: ChangePasswordForm =
      mode === 'password'
        ? { mode, current, password }
        : { mode, code, password };
    const errors = changePasswordErrors(form, {
      email,
      username: me?.username ?? null,
    });
    setSubmitted(true);
    setPasswordError(errors.password ?? null);
    if (errors.current) return void currentInput.current?.focus();
    if (errors.code) return void codeInput.current?.focus();
    Keyboard.dismiss();
    if (errors.password) return;
    const others = Math.max(0, (sessions?.length ?? 1) - 1);
    const result = await saver.run(form);
    if (!result) return;
    if (result.ok) return setSavedOthers(others);
    const { error } = result;
    if (error.kind === 'current-wrong') setCurrentError(true);
    else if (error.kind === 'rate-limited') setLockedUntil(error.until);
    else if (error.kind === 'password') setPasswordError(error.error);
    else if (error.kind === 'network' || error.kind === 'other')
      showErrorToast(error.kind);
    else setCodeError(error);
  };

  // Spec 07 › Lưu thay đổi: back with something typed asks first; not once saved.
  const dirty = !!(current || code || password);
  const [leaving, setLeaving] = useState<null | (() => void)>(null);
  usePreventRemove(dirty && !busy && savedOthers === null, ({ data }) =>
    setLeaving(() => () => navigation.dispatch(data.action)),
  );
  // After the render that lifted the guard, so leaving is not asked about.
  const finish = useEffectEvent((others: number) => {
    onSaved(others);
    showToast({ message: t('me.passwordSaved', { count: others }) });
  });
  useEffect(() => {
    if (savedOthers !== null) finish(savedOthers);
  }, [savedOthers]);

  const locked = mode === 'password' && lockWait > 0;
  const codeMessage = !online
    ? null
    : (codeErrorMessage(t, codeError) ??
      (codeLimitWait > 0
        ? {
            tone: 'info' as const,
            icon: Clock3,
            text: t('auth.forgot.rateLimited', {
              count: Math.ceil(codeLimitWait / 60),
            }),
          }
        : null));

  const newPassword = (
    <View style={styles.field}>
      <TextField
        ref={newInput}
        label={t('me.newPassword')}
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
        onSubmitEditing={() => void save()}
      />
      <PasswordRules
        issues={checkPassword(password).filter(
          (i) => i !== 'SAME_AS_PERSONAL_INFO',
        )}
        submitted={submitted && passwordError === 'rules'}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.screen, { backgroundColor: colors.bg }]}
    >
      <ScreenHeader
        title={t('me.changePassword')}
        onBack={onBack}
        action={
          <Button
            variant="text"
            size="S"
            label={t('me.save')}
            loading={busy}
            disabled={!online || locked || (mode === 'code' && needsNewCode)}
            onPress={() => void save()}
          />
        }
      />
      <ConnectionBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'password' ? (
          <>
            <View style={styles.field}>
              <TextField
                ref={currentInput}
                label={t('me.currentPassword')}
                value={current}
                onChangeText={(v) => {
                  setCurrent(v);
                  setCurrentError(false);
                }}
                password
                error={currentError ? t('me.currentWrong') : null}
                readonly={busy}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="next"
                onSubmitEditing={() => newInput.current?.focus()}
              />
              <View style={styles.right}>
                <InlineLink link={t('me.forgot')} onPress={enterCodeMode} />
              </View>
            </View>
            {locked && (
              <FormMessage
                tone="info"
                icon={Clock3}
                text={t('me.rateLimited', { count: Math.ceil(lockWait / 60) })}
              />
            )}
            {newPassword}
          </>
        ) : (
          <>
            <Text color="text-secondary">
              {t('me.codeSent', { email: breakableEmail(email) })}
            </Text>
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
                  if (next.length === CODE_LENGTH) newInput.current?.focus();
                }}
                error={codeError?.kind === 'code-wrong'}
                verifying={busy}
                disabled={!online || needsNewCode}
                autoFocus={false}
              />
              {codeMessage && <FormMessage {...codeMessage} />}
            </View>
            {needsNewCode && (
              <Button
                size="L"
                variant="secondary"
                fullWidth
                label={t('auth.enterCode.sendNew')}
                loading={sender.pending}
                disabled={!online || codeLimitWait > 0 || wait > 0}
                onPress={() => void sendCode(true)}
              />
            )}
            {(!needsNewCode || wait > 0) && (
              <InlineLink
                center={false}
                prefix={t('auth.enterCode.noCode')}
                link={
                  wait > 0
                    ? t('auth.enterCode.resendIn', {
                        time: countdownText(wait),
                      })
                    : t('auth.enterCode.resend')
                }
                disabled={
                  !online || wait > 0 || codeLimitWait > 0 || sender.pending
                }
                onPress={() => void sendCode(true)}
              />
            )}
            {newPassword}
          </>
        )}
        <Text variant="label" color="text-tertiary">
          {t('me.othersSignedOut')}
        </Text>
        {mode === 'code' && (
          <InlineLink
            center={false}
            link={t('me.useCurrent')}
            onPress={() => {
              setMode('password');
              setCodeError(null);
            }}
          />
        )}
      </ScrollView>

      <Dialog
        visible={!!leaving}
        title={t('me.discardTitle')}
        cancel={{ label: t('me.stay'), onPress: () => setLeaving(null) }}
        confirm={{
          label: t('me.discard'),
          variant: 'danger',
          onPress: () => {
            const go = leaving;
            setLeaving(null);
            go?.();
          },
        }}
        onDismiss={() => setLeaving(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[3], gap: space[3] },
  field: { gap: size.iconGap },
  right: { alignItems: 'flex-end' },
});
