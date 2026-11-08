import {
  checkPassword,
  normalizeUsername,
  suggestUsername,
  TERMS_VERSION,
  USERNAME_MAX,
} from '@nezfocus/shared';
import { CircleCheck, LoaderCircle } from 'lucide-react-native';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import {
  completeAccountErrors,
  firstError,
  type CompleteAccountErrors,
  type CompleteAccountField,
} from '../../../domain/auth/completeAccount';
import {
  gmtLabel,
  timeZoneOptions,
  zoneLabel,
  zoneOffsetMinutes,
} from '../../../domain/auth/timeZones';
import { sessionStore } from '../../../domain/session/sessionStore';
import { currentLanguage, setLanguage } from '../../../shared/i18n';
import {
  fontScale as textScale,
  size,
  space,
  useTheme,
} from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { SystemBanner } from '../../../shared/ui/Feedback';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Icon } from '../../../shared/ui/Icon';
import { PasswordRules } from '../../../shared/ui/PasswordRules';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { useToastAnchor } from '../../../shared/ui/Toast';
import { InlineLink } from '../components/AuthScreen';
import { BottomFade } from '../components/BottomFade';
import { TimeZoneSheet } from '../components/TimeZoneSheet';
import { breakableEmail } from '../format';
import {
  showErrorToast,
  useFinishAccount,
  useLogOut,
  useUsernameStatus,
} from '../hooks/useAuthActions';
import { useOnline } from '../hooks/useAuthForm';
import { useAuthFlow } from '../authFlowStore';
import { PRIVACY_URL, TERMS_URL } from '../legal';
import { availableTimeZones, deviceTimeZone } from '../timeZoneList';

const DEVICE_ZONE = deviceTimeZone();

// S-ONB-01: the one screen every new account passes. No header, the main button pinned at the
// bottom; nothing typed here survives the app being killed (the session does).
export function CompleteAccountScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const large = fontScale >= textScale.large;
  const online = useOnline();
  const user = useStore(sessionStore, (s) => s.user);
  const email = user?.email ?? '';
  const suggested = useAuthFlow((s) => s.suggestedUsername);
  const lang = i18n.language === 'en' ? 'en' : 'vi';

  const [displayName, setDisplayName] = useState('');
  // AUTH-01: the backend's suggestion from the OTP sign-in; after an app restart, the same
  // rule (shared suggestUsername) worked out from the email.
  const [username, setUsername] = useState(
    () => suggested ?? suggestUsername(email) ?? '',
  );
  const [password, setPassword] = useState('');
  const [timeZone, setTimeZone] = useState<string | null>(null); // null = the phone's
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<CompleteAccountErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const usernameStatus = useUsernameStatus(username);
  // GMT offsets are read once, when the screen opens.
  const [openedAt] = useState(() => new Date());

  const zones = useMemo(
    () => timeZoneOptions(availableTimeZones(), openedAt, lang),
    [lang, openedAt],
  );
  const zone = timeZone ?? DEVICE_ZONE;

  // Scroll targets: y of each field inside the scroll content.
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const fieldY = useRef<Partial<Record<CompleteAccountField, number>>>({});
  const at = (field: CompleteAccountField) => ({
    onLayout: (e: { nativeEvent: { layout: { y: number } } }) => {
      fieldY.current[field] = e.nativeEvent.layout.y;
    },
  });
  const scrollTo = (field: CompleteAccountField | undefined) => {
    if (!field) return;
    scroll.current?.scrollTo({
      y: Math.max(0, (fieldY.current[field] ?? 0) - space[3]),
      animated: true,
    });
  };

  const [footerHeight, setFooterHeight] = useState(0);
  useToastAnchor(footerHeight);

  const clear = (field: CompleteAccountField) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setSaveFailed(false);
  };

  const finish = useFinishAccount(user ?? { id: '', email });
  const submit = {
    pending: finish.pending,
    run: async () => {
      const found = completeAccountErrors(
        { displayName, username, password, ageConfirmed, termsAccepted },
        email,
      );
      setSubmitted(true);
      setSaveFailed(false);
      if (firstError(found)) {
        setErrors(found);
        scrollTo(firstError(found));
        return;
      }
      const result = await finish.run({
        display_name: displayName.trim(),
        username: normalizeUsername(username),
        password,
        timezone: zone,
        locale: lang,
        age_confirmed: true,
        terms_accepted: true,
        terms_version: TERMS_VERSION,
      });
      if (!result || result.ok) return;
      if ('fields' in result) {
        // username-taken-on-submit: only that field changes, the rest (password too) stays.
        setErrors(result.fields);
        scrollTo(firstError(result.fields));
      } else if (result.error === 'other') setSaveFailed(true);
      else showErrorToast('network');
    },
  };
  const { run: logOut, pending: loggingOut } = useLogOut();

  const busy = finish.pending;
  const usernameError =
    errors.username ?? (usernameStatus === 'taken' ? 'taken' : undefined);
  const usernameErrorText =
    usernameError &&
    t(
      (
        {
          length: 'auth.complete.usernameHint',
          'invalid-chars': 'auth.complete.invalidChars',
          taken: 'auth.complete.taken',
          'taken-on-submit': 'auth.complete.takenOnSubmit',
        } as const
      )[usernameError],
    );
  const usernameNote =
    usernameStatus === 'checking'
      ? { icon: LoaderCircle, text: t('auth.complete.checking') }
      : usernameStatus === 'available'
        ? { icon: CircleCheck, text: t('auth.complete.available') }
        : { text: t('auth.complete.usernameHint') };

  const passwordError =
    errors.password &&
    {
      rules: t('auth.complete.passwordRules'),
      'same-email': t('auth.complete.sameEmail'),
      'same-username': t('auth.complete.sameUsername'),
    }[errors.password];

  const footerMessage = !online
    ? { tone: 'info' as const, text: t('auth.complete.offline') }
    : saveFailed
      ? { tone: 'error' as const, text: t('auth.errors.other') }
      : null;

  const languageControl = (
    <SegmentedControl
      segments={[
        { key: 'vi', label: t('auth.complete.vi') },
        { key: 'en', label: t('auth.complete.en') },
      ]}
      value={currentLanguage()}
      onChange={(next) => void setLanguage(next)}
    />
  );

  return (
    // The pinned button rides just above the keyboard (C-02).
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.screen, { backgroundColor: colors.bg }]}
    >
      <View style={{ paddingTop: top }}>
        {!online && <SystemBanner kind="offline" />}
      </View>
      <View style={styles.flex}>
        <ScrollView
          persistentScrollbar
          ref={scroll}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.intro}>
            <Text variant="title-1" accessibilityRole="header">
              {t('auth.complete.title')}
            </Text>
            <Text color="text-secondary">
              {t('auth.complete.confirmed', {
                email: breakableEmail(email),
              })}
            </Text>
          </View>

          <View {...at('displayName')}>
            <TextField
              label={t('auth.complete.displayName')}
              placeholder={t('auth.complete.displayNamePlaceholder')}
              helper={t('auth.complete.displayNameHelp')}
              value={displayName}
              onChangeText={(v) => {
                setDisplayName(v);
                clear('displayName');
              }}
              error={
                errors.displayName &&
                t(
                  errors.displayName === 'empty'
                    ? 'auth.complete.displayNameEmpty'
                    : 'auth.complete.displayNameTooLong',
                )
              }
              readonly={busy}
              autoComplete="name"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field} {...at('username')}>
            <TextField
              label={t('auth.complete.username')}
              value={username}
              onChangeText={(v) => {
                setUsername(v.toLowerCase()); // DEC-03: capitals turn lowercase as typed
                clear('username');
              }}
              error={usernameErrorText}
              readonly={busy}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              maxLength={USERNAME_MAX}
              trailing={
                usernameStatus === 'checking' ? (
                  <ActivityIndicator
                    size="small"
                    color={colors['text-tertiary']}
                  />
                ) : usernameStatus === 'available' && !usernameError ? (
                  <Icon as={CircleCheck} size="md" color="success" />
                ) : null
              }
            />
            {!usernameError && (
              <FormMessage variant="field" tone="info" {...usernameNote} />
            )}
          </View>

          <View style={styles.field} {...at('password')}>
            <TextField
              label={t('auth.complete.password')}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                clear('password');
              }}
              password
              error={passwordError}
              readonly={busy}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <PasswordRules
              issues={checkPassword(password).filter(
                (i) => i !== 'SAME_AS_PERSONAL_INFO',
              )}
              submitted={submitted && errors.password === 'rules'}
            />
          </View>

          <View>
            <SettingsRow
              label={t('auth.complete.timeZone')}
              value={zoneLabel(zone, openedAt, lang)}
              description={
                timeZone && timeZone !== DEVICE_ZONE
                  ? t('auth.complete.otherThanDevice', {
                      gmt: gmtLabel(zoneOffsetMinutes(DEVICE_ZONE, openedAt)),
                    })
                  : undefined
              }
              onPress={() => setSheetOpen(true)}
              disabled={busy}
            />
            <View style={[styles.languageRow, large && styles.languageStacked]}>
              <Text>{t('auth.complete.language')}</Text>
              <View style={!large && styles.flex}>{languageControl}</View>
            </View>
            <Text variant="label" color="text-tertiary">
              {t('auth.complete.timeZoneNote')}
            </Text>
          </View>

          <View {...at('age')}>
            <Checkbox
              checked={ageConfirmed}
              onChange={(v) => {
                setAgeConfirmed(v);
                clear('age');
              }}
              label={t('auth.complete.age')}
              error={errors.age && t('auth.complete.required')}
              disabled={busy}
            />
          </View>
          <View {...at('terms')}>
            <Checkbox
              checked={termsAccepted}
              onChange={(v) => {
                setTermsAccepted(v);
                clear('terms');
              }}
              label={t('auth.complete.termsLabel')}
              error={errors.terms && t('auth.complete.required')}
              disabled={busy}
            >
              <Text>
                {t('auth.complete.termsBefore')}
                <Text
                  weight="600"
                  color="primary"
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(TERMS_URL)}
                >
                  {t('auth.complete.terms')}
                </Text>
                {t('auth.complete.termsAnd')}
                <Text
                  weight="600"
                  color="primary"
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(PRIVACY_URL)}
                >
                  {t('auth.complete.privacy')}
                </Text>
              </Text>
            </Checkbox>
          </View>

          <InlineLink
            center={false}
            link={t('auth.complete.signOut')}
            disabled={busy || loggingOut}
            onPress={() => void logOut()}
          />
        </ScrollView>
        <BottomFade />
      </View>

      <View
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
        style={[
          styles.footer,
          {
            paddingBottom: bottom + space[3],
            borderTopColor: colors.border,
            backgroundColor: colors.bg,
          },
        ]}
      >
        {footerMessage && <FormMessage {...footerMessage} />}
        <Button
          size="L"
          fullWidth
          label={t('auth.complete.submit')}
          labelMaxScale={textScale.narrowLabel}
          loading={busy}
          disabled={!online}
          onPress={() => void submit.run()}
        />
      </View>

      <TimeZoneSheet
        visible={sheetOpen}
        options={zones}
        deviceLabel={zoneLabel(DEVICE_ZONE, openedAt, lang)}
        value={timeZone}
        onChange={setTimeZone}
        onDismiss={() => setSheetOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: space[3], gap: space[4] },
  intro: { gap: space[2] },
  field: { gap: size.iconGap },
  languageRow: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  languageStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: space[2],
    paddingVertical: space[2],
  },
  footer: {
    paddingHorizontal: space[3],
    paddingTop: space[3],
    gap: space[2],
    borderTopWidth: size.hairline,
  },
});
