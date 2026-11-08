import type { ServerTemplate } from '@nezfocus/shared';
import { usePreventRemove } from '@react-navigation/native';
import {
  Camera,
  Circle,
  CircleDot,
  Hash,
  LampDesk,
  Ticket,
  WifiOff,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { gatewayStore } from '../../../domain/gateway/gatewayStore';
import { radius, size, space, useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/ui/Button';
import { FormMessage } from '../../../shared/ui/FormMessage';
import { Icon } from '../../../shared/ui/Icon';
import { ScreenHeader } from '../../../shared/ui/ScreenHeader';
import { SettingsRow } from '../../../shared/ui/SettingsRow';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';
import { useCreateServer } from '../hooks/useCreateServer';

// ponytail: the Study Server template opens in P4-A2 (#168); until then its card stays hidden.
const STUDY_SERVER_TEMPLATE = false;
const PICKER = 96; // S-HOME-06 name-server: round icon slot 96

type Props = {
  onClose: () => void;
  onJoinByCode: () => void;
  onCreated: () => void;
};

// 02 › S-HOME-06 (create part): choose-template → name-server → creating / create-error.
export function CreateServerScreen({
  onClose,
  onJoinByCode,
  onCreated,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const online = useStore(gatewayStore, (s) => s.online);
  const [step, setStep] = useState<'choose' | 'name'>('choose');
  const [template, setTemplate] = useState<ServerTemplate>(
    STUDY_SERVER_TEMPLATE ? 'study_server' : 'general',
  );
  const [name, setName] = useState('');
  // Leave only after a render without the Back guard below, or it would block the way out.
  const [created, setCreated] = useState(false);
  const create = useCreateServer(() => setCreated(true));
  useEffect(() => {
    if (created) onCreated();
  }, [created, onCreated]);

  // Back at name-server returns to choose-template and keeps the name (S-HOME-06 › Tương tác).
  const back = () => {
    if (step === 'choose') return onClose();
    create.clearError();
    setStep('choose');
  };
  usePreventRemove(step === 'name' && !created, back);

  const submit = () => void create.submit(template, name);
  const failure = create.error && create.error !== 'name' && (
    <FormMessage
      tone="error"
      text={
        create.error === 'other'
          ? t('auth.errors.other')
          : t(
              create.error === 'max-servers'
                ? 'servers.create.maxServers'
                : 'servers.create.network',
            )
      }
    />
  );

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      <View style={{ paddingTop: top }}>
        <ScreenHeader
          title={
            step === 'choose'
              ? t('servers.create.title')
              : t(`servers.create.nameTitle_${template}`)
          }
          onBack={back}
        />
      </View>
      <ScrollView
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.body,
          { paddingBottom: bottom + space[3] },
        ]}
      >
        {step === 'choose' ? (
          <>
            <Text variant="title-2" accessibilityRole="header">
              {t('servers.create.section')}
            </Text>
            {STUDY_SERVER_TEMPLATE && (
              <TemplateCard
                icon={LampDesk}
                title={t('servers.create.studyTitle')}
                chip={t('servers.create.studyChip')}
                body={t('servers.create.studyBody')}
                selected={template === 'study_server'}
                onPress={() => setTemplate('study_server')}
              />
            )}
            <TemplateCard
              icon={Hash}
              title={t('servers.create.generalTitle')}
              body={t('servers.create.generalBody')}
              selected={template === 'general'}
              onPress={() => setTemplate('general')}
            />
            <View style={styles.gap} />
            <Text variant="title-2" accessibilityRole="header">
              {t('servers.create.joinSection')}
            </Text>
            <SettingsRow
              icon={Ticket}
              label={t('servers.create.join')}
              onPress={onJoinByCode}
            />
          </>
        ) : (
          <>
            {/* ponytail: server icons (POST /attachments server_icon) are not needed in P1; no picker yet. */}
            <View style={styles.pickerWrap}>
              <View
                style={[styles.picker, { borderColor: colors['border-input'] }]}
              >
                <Icon as={Camera} />
                <Text variant="label" color="text-secondary">
                  {t('servers.create.addPhoto')}
                </Text>
              </View>
              <Text variant="label" color="text-tertiary">
                {t('servers.create.optional')}
              </Text>
            </View>
            <TextField
              label={t('servers.create.nameLabel')}
              placeholder={t(`servers.create.namePlaceholder_${template}`)}
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (create.error === 'name') create.clearError();
              }}
              error={
                create.error === 'name' ? t('servers.create.nameError') : null
              }
              readonly={create.pending}
              maxLength={100}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={online ? submit : undefined}
            />
          </>
        )}
        <View style={styles.flex} />
        {!online ? (
          <View style={styles.offline}>
            <Icon as={WifiOff} size="sm" />
            <Text variant="label" color="text-secondary" style={styles.flex}>
              {t('servers.create.offline')}
            </Text>
          </View>
        ) : (
          step === 'name' && failure
        )}
        <Button
          size="L"
          fullWidth
          label={t(
            step === 'choose'
              ? 'servers.create.continue'
              : 'servers.create.submit',
          )}
          loading={step === 'name' && create.pending}
          disabled={!online}
          onPress={step === 'choose' ? () => setStep('name') : submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TemplateCard({
  icon,
  title,
  chip,
  body,
  selected,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  chip?: string;
  body: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
      style={[
        styles.card,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors['surface-1'] : undefined,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <Icon as={icon} size="md" color="text-primary" />
        <Text variant="headline" weight="600">
          {title}
        </Text>
        {chip && (
          <Text variant="label" weight="600" color="primary">
            {chip}
          </Text>
        )}
        <View style={styles.flex} />
        <Icon
          as={selected ? CircleDot : Circle}
          size="lg"
          color={selected ? 'primary' : 'border-input'}
        />
      </View>
      <Text variant="body-sm" color="text-secondary">
        {body}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    flexGrow: 1,
    gap: space[2] + space[1], // frame Body gap 12
    paddingTop: space[2],
    paddingHorizontal: space[3],
  },
  gap: { height: space[2] },
  card: {
    borderWidth: size.hairline,
    borderRadius: radius.button,
    padding: space[3],
    gap: space[1],
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  pickerWrap: {
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[2],
  },
  picker: {
    width: PICKER,
    height: PICKER,
    borderRadius: radius.server,
    borderWidth: size.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
  },
  offline: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
