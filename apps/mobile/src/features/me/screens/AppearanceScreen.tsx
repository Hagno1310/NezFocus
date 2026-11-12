import type { ThemePreference } from '@nezfocus/shared';
import { Lock } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { timeZoneOptions, zoneLabel } from '../../../domain/auth/timeZones';
import { lockedNote, timezoneLock } from '../../../domain/settings/timezone';
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
import { TimeZoneSheet } from '../../auth/components/TimeZoneSheet';
import { availableTimeZones, deviceTimeZone } from '../../auth/timeZoneList';
import { ConnectionBanner } from '../../gateway/components/ConnectionBanner';
import {
  changeAppearance,
  useChangeTimezone,
  useSettings,
} from '../hooks/useSettings';

const THEMES: ThemePreference[] = ['system', 'dark', 'light'];
const DEVICE_ZONE = deviceTimeZone();
const clock = () => new Date();

// S-ME-06: theme and language apply at once, offline too (saved on the phone, synced later);
// the time zone asks first, at most once per 24 hours (REQ-STUDY-03), and needs the network.
export function AppearanceScreen({ onBack }: { onBack: () => void }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { settings: s, canSave } = useSettings();
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
  const [refusedUntil, setRefusedUntil] = useState<Date | null>(null);
  const timezone = useChangeTimezone();

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

  // STUDY-03 AC4 (also a change made on another device): the dialog closes into
  // `timezone-rate-limited`.
  const confirm = async (zone: string) => {
    const until = await timezone.change(zone);
    setNow(clock());
    setConfirming(null);
    if (until) setRefusedUntil(until);
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
            onPress={() => changeAppearance({ theme: key })}
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
          onChange={(locale) => changeAppearance({ locale })}
        />
        <SectionLabel style={styles.section}>
          {t('me.timezoneSection')}
        </SectionLabel>
        <SettingsRow
          label={t('me.timezone')}
          value={zoneLabel(s.timezone, openedAt, lang)}
          disabled={!canSave || !!locked}
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
          loading: timezone.saving,
          onPress: () => confirming && void confirm(confirming),
        }}
        onDismiss={() => !timezone.saving && setConfirming(null)}
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
