import { CYCLE_PRESETS as PRESETS, CycleConfig } from '@nezfocus/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { space } from '../../../shared/theme';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { SegmentedControl } from '../../../shared/ui/SegmentedControl';
import { Switch } from '../../../shared/ui/Switch';
import { Text } from '../../../shared/ui/Text';
import { TextField } from '../../../shared/ui/TextField';

type Choice = '25/5' | '50/10' | 'custom';
type Field =
  'focus_min' | 'short_break_min' | 'long_break_min' | 'long_break_every';

const TEXT = {
  start: {
    title: 'study.sheet.chooseTitle',
    note: 'study.sheet.chooseNote',
    action: 'study.start',
  },
  edit: {
    title: 'study.sheet.editTitle',
    note: 'study.sheet.editNote',
    action: 'study.sheet.apply',
  },
  default: {
    title: 'study.sheet.defaultTitle',
    note: 'study.sheet.defaultNote',
    action: 'study.sheet.save',
  },
} as const;

const choiceOf = (c: CycleConfig): Choice =>
  c.long_break_min === undefined &&
  (['25/5', '50/10'] as const).find(
    (k) =>
      PRESETS[k].focus_min === c.focus_min &&
      PRESETS[k].short_break_min === c.short_break_min,
  )
    ? (`${c.focus_min}/${c.short_break_min}` as Choice)
    : 'custom';

// S-STUDY-01 cycle-sheet, S-STUDY-02 edit-cycle-sheet and S-SET-07 cycle-sheet (`default`):
// same choices (S-ROOM-03), different title, note and button.
export function CycleSheet({
  visible,
  mode,
  initial,
  loading,
  onSubmit,
  onDismiss,
  onKeep,
}: {
  visible: boolean;
  mode: 'start' | 'edit' | 'default';
  initial: CycleConfig;
  loading?: boolean;
  onSubmit: (cycle: CycleConfig) => void;
  onDismiss: () => void;
  // S-STUDY-01 cycle-sheet: closing without "Bắt đầu" still keeps a valid new choice.
  onKeep?: (cycle: CycleConfig) => void;
}) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<Choice>(() => choiceOf(initial));
  const [fields, setFields] = useState<Record<Field, string>>(() => ({
    focus_min: String(initial.focus_min),
    short_break_min: String(initial.short_break_min),
    long_break_min: String(initial.long_break_min ?? 15),
    long_break_every: String(initial.long_break_every ?? 4),
  }));
  const [longOn, setLongOn] = useState(initial.long_break_min !== undefined);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const custom = {
    focus_min: Number(fields.focus_min),
    short_break_min: Number(fields.short_break_min),
    ...(longOn && {
      long_break_min: Number(fields.long_break_min),
      long_break_every: Number(fields.long_break_every),
    }),
  };

  const dismiss = () => {
    const kept =
      choice === 'custom'
        ? CycleConfig.safeParse(custom).data
        : PRESETS[choice];
    if (kept && onKeep) onKeep(kept);
    onDismiss();
  };

  const submit = () => {
    if (choice !== 'custom') return onSubmit(PRESETS[choice]);
    const parsed = CycleConfig.safeParse(custom);
    if (parsed.success) return onSubmit(parsed.data);
    setErrors(
      Object.fromEntries(
        parsed.error.issues.map((i) => [
          i.path[0],
          t(`study.sheet.errors.${i.path[0] as Field}`),
        ]),
      ),
    );
  };

  const field = (key: Field, label: string) => (
    <View style={styles.flex}>
      <TextField
        label={label}
        value={fields[key]}
        keyboardType="number-pad"
        error={errors[key]}
        onChangeText={(v) => {
          setFields((f) => ({ ...f, [key]: v.replace(/\D/g, '') }));
          setErrors((e) => ({ ...e, [key]: undefined }));
        }}
      />
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      title={t(TEXT[mode].title)}
      onDismiss={dismiss}
      action={{ label: t(TEXT[mode].action), onPress: submit, loading }}
    >
      <View style={styles.body}>
        <Text variant="body" color="text-secondary">
          {t(TEXT[mode].note)}
        </Text>
        <SegmentedControl
          segments={[
            { key: '25/5', label: '25/5' },
            { key: '50/10', label: '50/10' },
            { key: 'custom', label: t('study.sheet.custom') },
          ]}
          value={choice}
          onChange={setChoice}
        />
        {choice === 'custom' ? (
          <>
            <View style={styles.pair}>
              {field('focus_min', t('study.sheet.focus'))}
              {field('short_break_min', t('study.sheet.short'))}
            </View>
            <View style={styles.switchRow}>
              <Text variant="body" style={styles.flex}>
                {t('study.sheet.longSwitch')}
              </Text>
              <Switch
                value={longOn}
                onChange={setLongOn}
                label={t('study.sheet.longSwitch')}
              />
            </View>
            {longOn && (
              <>
                <View style={styles.pair}>
                  {field('long_break_min', t('study.sheet.long'))}
                  {field('long_break_every', t('study.sheet.every'))}
                </View>
                <Text variant="label" color="text-secondary">
                  {t('study.sheet.summaryLong', {
                    focus: fields.focus_min,
                    brk: fields.short_break_min,
                    long: fields.long_break_min,
                    every: fields.long_break_every,
                  })}
                </Text>
              </>
            )}
          </>
        ) : (
          // S-SET-07 `cycle-sheet` has no such line.
          mode !== 'default' && (
            <Text variant="label" color="text-secondary">
              {t('study.sheet.longOff')}
            </Text>
          )
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingVertical: space[2] },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  // S-ROOM-03 `custom`: the two fields of a pair side by side.
  pair: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  flex: { flex: 1 },
});
