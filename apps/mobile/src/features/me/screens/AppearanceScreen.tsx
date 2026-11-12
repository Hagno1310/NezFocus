import { DEFAULT_USER_SETTINGS, type ThemePreference } from '@nezfocus/shared';
import { Lock } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { appearance, settingsRepository } from '../../../data/settings';
import { timeZoneOptions, zoneLabel } from '../../../domain/auth/timeZones';
import {
  changeTimezone,
  lockedNote,
  timezoneLock,
} from '../../../domain/settings/timezone';
import { settingsStore } from '../../../domain/settings/settingsStore';
import { currentLanguage, type Language } from '../../../shared/i18n';
import { space, useTheme, useThemePreference } from '../../../shared/theme';
import { NoteLine } from '../../../shared/ui/NoteLine';
import { Dialog } from '../../../shared/ui/Overlay';
import { RadioRow } from '../../../shared/ui/RadioRow';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { SectionLabel } from '../../../shared/ui/SectionLabel';
import { Text } from '../../../shared/ui/Text';
import { showToast } from '../../../shared/ui/Toast';
import { TimeZoneSheet } from '../../auth/components/TimeZoneSheet';
import { availableTimeZones, deviceTimeZone } from '../../auth/timeZoneList';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import { useOnline } from '../../gateway/hooks/useOnline';
import { useSettings } from '../hooks/useSettings';

const THEMES: ThemePreference[] = ['system', 'dark', 'light'];
const DEVICE_ZONE = deviceTimeZone();
const clock = () => new Date();

// S-ME-06: theme and language apply at once, offline too (saved on the phone, synced later);
// the time zone asks first, at most once per 24 hours (REQ-STUDY-03), and needs the network.
export function AppearanceScreen({ onBack }: { onBack: () => void }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const online = useOnline();
  const settings = useSettings();
  const theme = useThemePreference((s) => s.preference);
  const lang = (i18n.language as Language) ?? currentLanguage();
  const [openedAt] = useState(clock);
  // Re-read when the lock runs out, so the row comes back by itself.
  const [now, setNow] = useState(openedAt);
  const zones = useMemo(
    () => timeZoneOptions(availableTimeZones(), openedAt, lang),
    [lang, openedAt],
  );
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refusedUntil, setRefusedUntil] = useState<Date | null>(null);

  const s = settings ?? DEFAULT_USER_SETTINGS;
  const locked = timezoneLock(s, refusedUntil, now);
  const note = locked && lockedNote(locked, s.timezone);
  const lockedAt = locked?.getTime() ?? null;
  useEffect(() => {
    if (lockedAt === null) return;
    const id = setTimeout(() => setNow(clock()), lockedAt - clock().getTime());
    return () => clearTimeout(id);
  }, [lockedAt]);

  // The sheet ticks "Theo máy" while the account follows the phone's zone (frame).
  const pick = (zone: string | null) => {
    const next = zone ?? DEVICE_ZONE;
    if (next !== s.timezone) setConfirming(next);
  };

  const confirm = async (zone: string) => {
    setSaving(true);
    const r = await changeTimezone(settingsRepository, zone, clock());
    setNow(clock());
    setSaving(false);
    setConfirming(null);
    // Theme and language stay as this phone shows them (they may still be pending).
    if (r.ok)
      return settingsStore.setState({
        settings: { ...r.settings, theme: s.theme, locale: s.locale },
      });
    // STUDY-03 AC4 (also a change made on another device): `timezone-rate-limited`.
    if (r.error === 'rate-limited') return setRefusedUntil(r.until);
    showToast({
      message: t('servers.settings.saveFailed'),
      action: {
        label: t('servers.settings.retry'),
        onPress: () => void confirm(zone),
      },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('me.appearance')} onBack={onBack} />
      <ConnectionBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel style={styles.first}>{t('me.themeSection')}</SectionLabel>
        {THEMES.map((key) => (
          <RadioRow
            key={key}
            label={t(`me.theme.${key}`)}
            selected={theme === key}
            onPress={() => appearance.change({ theme: key })}
          />
        ))}
        <SectionLabel style={styles.section}>
          {t('me.languageSection')}
        </SectionLabel>
        <SegmentedControl
          segments={[
            { key: 'vi', label: t('auth.complete.vi') },
            { key: 'en', label: t('auth.complete.en') },
          ]}
          value={lang}
          onChange={(locale) => appearance.change({ locale })}
        />
        <SectionLabel style={styles.section}>
          {t('me.timezoneSection')}
        </SectionLabel>
        <SettingsRow
          label={t('me.timezone')}
          value={zoneLabel(s.timezone, openedAt, lang)}
          disabled={!online || !settings || !!locked}
          onPress={() => setPicking(true)}
        />
        <Text variant="label" color="text-secondary">
          {t('me.timezoneHint')}
        </Text>
        {note && <NoteLine icon={Lock} text={t('me.timezoneLocked', note)} />}
      </ScrollView>

      <TimeZoneSheet
        visible={picking}
        options={zones}
        deviceLabel={zoneLabel(DEVICE_ZONE, openedAt, lang)}
        value={s.timezone === DEVICE_ZONE ? null : s.timezone}
        onChange={pick}
        onDismiss={() => setPicking(false)}
      />
      {/* Frame `timezone-confirm`: the two buttons side by side (C-09 exception, 12/11/2026). */}
      <Dialog
        visible={confirming !== null}
        title={t('me.timezoneConfirm', {
          zone: confirming ? zoneLabel(confirming, openedAt, lang) : '',
        })}
        body={t('me.timezoneConfirmBody')}
        row
        cancel={{ label: t('me.cancel'), onPress: () => setConfirming(null) }}
        confirm={{
          label: t('me.timezoneChange'),
          loading: saving,
          onPress: () => confirming && void confirm(confirming),
        }}
        onDismiss={() => !saving && setConfirming(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space[3], paddingBottom: space[4] },
  first: { paddingTop: space[3], paddingBottom: space[1] },
  section: { paddingTop: space[4], paddingBottom: space[2] },
});
