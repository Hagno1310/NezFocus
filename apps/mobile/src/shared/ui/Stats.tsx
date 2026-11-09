import { LampDesk, Timer } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  fontScale,
  radius,
  size,
  space,
  useTheme,
  type ColorToken,
  type TypeVariant,
} from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';
import { Tooltip } from './Tooltip';

const parts = (text: string) => text.split(/(\d+)/).filter(Boolean);
const isNumber = (s: string) => /^\d+$/.test(s);

// 04 › Số: numbers in Unbounded (`numeric-inline`), words in Be Vietnam Pro, one wrapping line.
export function NumberText({
  text,
  variant = 'label',
  color = 'text-secondary',
  numberOfLines,
  max = Infinity,
}: {
  text: string;
  variant?: TypeVariant;
  color?: ColorToken;
  numberOfLines?: number;
  // Only the first `max` numbers are figures; later ones (the fixed "15 phút") stay text.
  max?: number;
}) {
  let seen = 0;
  return (
    <Text variant={variant} color={color} numberOfLines={numberOfLines}>
      {parts(text).map((p, i) =>
        isNumber(p) && seen++ < max ? (
          <Text key={i} variant="numeric-inline" color={color}>
            {p}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

// "4 giờ 35 phút" / "6 ngày liên tiếp": `stat` numbers, `body` units on one baseline.
export function StatText({ text }: { text: string }) {
  return (
    <View accessible accessibilityLabel={text} style={styles.stat}>
      {text.split(' ').map((w, i) => (
        <Text key={i} variant={isNumber(w) ? 'stat' : 'body'}>
          {w}
        </Text>
      ))}
    </View>
  );
}

// C-37: never a mascot nor a semantic colour, 15 minutes reached included.
export function TodayProgress({
  label,
  a11y,
  ratio,
}: {
  label: string;
  a11y: string;
  ratio: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ text: a11y }}
      style={styles.progress}
    >
      {/* Frame C-37: only today's minutes is a figure, "15 phút" is the fixed goal. */}
      <NumberText text={label} max={1} />
      <View style={[styles.track, { backgroundColor: colors['surface-2'] }]}>
        <View
          style={[
            styles.fill,
            { width: `${ratio * 100}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

export type CalendarCell = {
  day: number;
  minutes: number;
  state: 'reached' | 'below' | 'future';
  today: boolean;
  a11y: string;
};

// C-38: reached = filled, below = outlined, so it reads in black and white.
export function MonthCalendar({
  title,
  weekdays,
  rows,
}: {
  title: string;
  weekdays: string[];
  rows: (CalendarCell | null)[][];
}) {
  const { colors } = useTheme();
  const [tip, setTip] = useState<string | null>(null);
  return (
    <View style={styles.calendar}>
      <NumberText text={title} variant="headline" color="text-primary" />
      <View style={styles.week}>
        {weekdays.map((w) => (
          <Text
            key={w}
            variant="label"
            color="text-tertiary"
            maxFontSizeMultiplier={fontScale.narrowLabel}
            style={styles.weekday}
          >
            {w}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.week}>
          {row.map((c, i) => {
            if (!c) return <View key={i} style={styles.cellSlot} />;
            const filled = c.state === 'reached';
            const fg: ColorToken = filled ? 'on-primary' : 'text-tertiary';
            return (
              <View key={i} style={styles.cellSlot}>
                <Pressable
                  accessible
                  accessibilityLabel={c.a11y}
                  onLongPress={() => setTip(c.a11y)}
                  onPressOut={() => setTip(null)}
                  style={[
                    styles.cell,
                    filled && { backgroundColor: colors.primary },
                    c.state === 'below' && {
                      borderWidth: size.hairline,
                      borderColor: colors['border-input'],
                    },
                    c.today && {
                      borderWidth: size.strokeThick,
                      borderColor: colors['text-primary'],
                    },
                  ]}
                >
                  <Text
                    variant="label"
                    color={fg}
                    maxFontSizeMultiplier={fontScale.narrowLabel}
                  >
                    {c.day}
                  </Text>
                  {c.state !== 'future' && (
                    <Text
                      variant="numeric-inline"
                      color={filled ? 'on-primary' : 'text-primary'}
                      maxFontSizeMultiplier={fontScale.narrowLabel}
                      style={styles.cellMinutes}
                    >
                      {c.minutes ? c.minutes : '—'}
                    </Text>
                  )}
                  {tip === c.a11y && <Tooltip text={c.a11y} />}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// C-39: read-only history row.
export function SessionRow({
  kind,
  title,
  line,
  minutes,
  running,
}: {
  kind: 'room' | 'solo';
  title: string;
  line: string;
  minutes: string;
  running?: string; // ChipStatus "Đang học"
}) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={[title, running, line, minutes]
        .filter(Boolean)
        .join(', ')}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <Icon as={kind === 'room' ? LampDesk : Timer} size="md" />
      {/* Frame C-39: line 1 = title, "Đang học", minutes; line 2 one plain line cut at the end. */}
      <View style={styles.rowText}>
        <View style={styles.rowLine}>
          <Text
            variant="body"
            weight="600"
            numberOfLines={1}
            style={styles.rowTitle}
          >
            {title}
          </Text>
          {running && (
            <View
              style={[styles.chip, { backgroundColor: colors['surface-2'] }]}
            >
              <Icon as={LampDesk} size="xs" color="text-secondary" />
              <Text variant="label" color="text-secondary">
                {running}
              </Text>
            </View>
          )}
          <NumberText text={minutes} color="text-primary" />
        </View>
        <Text variant="label" color="text-tertiary" numberOfLines={1}>
          {line}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: space[1],
  },
  progress: { gap: space[1] },
  track: { height: 6, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.full },
  calendar: { gap: space[1] },
  week: { flexDirection: 'row', gap: space[1] },
  weekday: { flex: 1, textAlign: 'center' },
  // Padding and borders live on the inner cell: Yoga adds them to a flex item's share, misaligning columns.
  cellSlot: { flex: 1, minHeight: 52 },
  cell: {
    flex: 1,
    borderRadius: radius.input,
    padding: space[1],
  },
  cellMinutes: { textAlign: 'center', marginTop: 2 },
  row: {
    minHeight: size.settingsRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
    paddingVertical: space[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowLine: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  // The title gives way first (04 › month · 360: room name cut before the minutes).
  rowTitle: { flex: 1, flexShrink: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: size.iconGap,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
});
