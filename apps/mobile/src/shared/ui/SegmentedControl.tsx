import { Check, Slash, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  disabledOpacity,
  fontScale,
  radius,
  size,
  space,
  touchSlop,
  useTheme,
  type ColorToken,
} from '../theme';
import { Icon, type IconComponent } from './Icon';
import { Text } from './Text';
import { Tooltip } from './Tooltip';

const GAP = size.segmentInset;
const slop = touchSlop(size.segment);

export type Segment<K extends string> = {
  key: K;
  label: string;
  count?: number;
  icon?: IconComponent;
  disabled?: boolean;
};

// C-20: switches between views of the same content. Never primary or phase colours.
export function SegmentedControl<K extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tip, setTip] = useState<K | null>(null);
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: colors['surface-2'] }]}
    >
      {segments.map((s, i) => {
        const selected = s.key === value;
        const fg: ColorToken = s.disabled
          ? 'text-tertiary'
          : selected
            ? 'text-primary'
            : 'text-secondary';
        return (
          <Pressable
            key={s.key}
            accessibilityRole="tab"
            accessibilityLabel={
              s.count === undefined ? s.label : `${s.label}, ${s.count}`
            }
            accessibilityState={{ selected, disabled: !!s.disabled }}
            accessibilityHint={t('ui.position', {
              index: i + 1,
              total: segments.length,
            })}
            disabled={s.disabled}
            hitSlop={{ top: slop, bottom: slop }}
            onPress={() => onChange(s.key)}
            onLongPress={() => setTip(s.key)}
            onPressOut={() => setTip(null)}
            style={({ pressed }) => [
              styles.segment,
              // C-20: a segment with a count is as wide as its text; the rest share the width.
              s.count === undefined ? styles.even : styles.fit,
              // ponytail: 4 items get 8 side padding so labels fit at 360; re-check the 4-item C-20 frame.
              segments.length >= 4 && styles.tight,
              selected && { backgroundColor: colors['surface-1'] },
              pressed &&
                !selected && { backgroundColor: colors['overlay-pressed'] },
            ]}
          >
            {/* Board Segment/item: label, icon 14, then "· 3" in the label's style. */}
            <Text
              variant="body-sm"
              weight={selected ? '600' : '500'}
              color={fg}
              numberOfLines={1}
              maxFontSizeMultiplier={fontScale.narrowLabel}
              style={styles.shrink}
            >
              {s.label}
            </Text>
            {s.icon && <Icon as={s.icon} size="xs" color={fg} />}
            {s.count !== undefined && (
              <Text
                variant="body-sm"
                weight={selected ? '600' : '500'}
                color={fg}
                maxFontSizeMultiplier={fontScale.narrowLabel}
              >
                {`· ${s.count}`}
              </Text>
            )}
            {tip === s.key && <Tooltip text={s.label} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export type TriValue = 'deny' | 'default' | 'allow';

const triOptions: { value: TriValue; icon: IconComponent; on: ColorToken }[] = [
  { value: 'deny', icon: X, on: 'danger' },
  { value: 'default', icon: Slash, on: 'text-secondary' },
  { value: 'allow', icon: Check, on: 'success' },
];

// C-20 `tri-state`: picks a value (radiogroup), meaning carried by the icon (NFR-A11Y-02).
export function TriState({
  label,
  value,
  onChange,
  disabled = false,
  allowDisabled = false,
}: {
  label: string;
  value: TriValue;
  onChange: (v: TriValue) => void;
  disabled?: boolean;
  allowDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[
        styles.track,
        styles.tri,
        { backgroundColor: colors['surface-2'] },
        disabled && styles.dim,
      ]}
    >
      {triOptions.map((o, i) => {
        const selected = o.value === value;
        const off = disabled || (allowDisabled && o.value === 'allow');
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={`${label}, ${t(`ui.tri.${o.value}`)}, ${t('ui.position', { index: i + 1, total: 3 })}`}
            accessibilityState={{ selected, disabled: off }}
            disabled={off}
            hitSlop={{
              top: touchSlop(size.tri.height),
              bottom: touchSlop(size.tri.height),
            }}
            onPress={() => onChange(o.value)}
            style={[
              styles.triItem,
              selected && { backgroundColor: colors['surface-1'] },
              !disabled && off && styles.dim,
            ]}
          >
            <Icon
              as={o.icon}
              size="sm"
              color={selected ? o.on : 'text-tertiary'}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.button,
    padding: GAP,
    gap: GAP,
  },
  segment: {
    height: size.segment - GAP * 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: size.iconGap,
    paddingHorizontal: space[3],
    borderRadius: radius.input,
  },
  even: { flex: 1, minWidth: 0 },
  tight: { paddingHorizontal: space[2] },
  fit: { flexShrink: 0 },
  shrink: { flexShrink: 1 },
  tri: { alignSelf: 'flex-start' },
  triItem: {
    width: size.tri.width,
    height: size.tri.height,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.badge,
  },
  dim: { opacity: disabledOpacity },
});
