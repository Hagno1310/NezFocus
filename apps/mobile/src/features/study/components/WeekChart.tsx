import type { StudyDay } from '@nezfocus/shared';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { weekChart, type DayTone } from '../../../domain/study/stats';
import {
  fontScale,
  space,
  useTheme,
  type ColorToken,
} from '../../../shared/theme';
import { Text } from '../../../shared/ui/Text';
import { minutesText, weekdays, weekdaysLong } from '../format';

// 04 › week-spike: the tallest column is 54; a day with minutes is at least 4; 0 is a flat 2.
const H = 54;
const MIN = 4;
const FLAT = 2;
const NUMBER = 20; // room for the number above the tallest column
const GUTTER = 64; // right margin for the "15 phút" label, fits it at fontScale.narrowLabel

const tone: Record<DayTone, ColorToken> = {
  today: 'primary',
  reached: 'surface-3',
  below: 'border',
};

// 04 › Biểu đồ tuần, for S-STUDY-01 and S-STUDY-03. Not a shared component.
// Numbers above the columns only on S-STUDY-03 (frames of S-STUDY-01 have none).
export function WeekChart({
  days,
  today,
  numbers = false,
}: {
  days: readonly StudyDay[];
  today: string;
  numbers?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bars, line } = weekChart(days, today);
  const names = weekdays(t);
  const longNames = weekdaysLong(t);
  const top = numbers ? NUMBER : 0;
  const lineY = top + H - line * H;
  return (
    <View>
      <View style={{ height: top + H }}>
        {/* Drawn first so the columns and their numbers sit on top of it. */}
        <Svg
          style={[StyleSheet.absoluteFill, { right: GUTTER }]}
          pointerEvents="none"
        >
          <Line
            x1={0}
            x2="100%"
            y1={lineY}
            y2={lineY}
            stroke={colors['border-input']}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        </Svg>
        <View style={styles.bars}>
          {bars.map((b, i) => (
            <View
              key={b.date}
              accessible
              accessibilityLabel={t('study.chartA11y', {
                weekday: longNames[i],
                minutes: minutesText(t, b.minutes),
              })}
              style={styles.column}
            >
              {!b.future && (
                <>
                  {/* 04 › Biểu đồ tuần: the 15-minute line never strikes through a number. */}
                  {numbers && (
                    <Text
                      variant="numeric-inline"
                      color="text-secondary"
                      maxFontSizeMultiplier={fontScale.narrowLabel}
                      style={{ backgroundColor: colors.bg }}
                    >
                      {b.minutes}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: b.minutes ? Math.max(MIN, b.height * H) : FLAT,
                        backgroundColor: colors[tone[b.tone]],
                      },
                    ]}
                  />
                </>
              )}
            </View>
          ))}
        </View>
        <Text
          variant="label"
          color="text-tertiary"
          numberOfLines={1}
          maxFontSizeMultiplier={fontScale.narrowLabel}
          style={[styles.lineLabel, { top: lineY - 10 }]}
        >
          {t('study.line15')}
        </Text>
      </View>
      <View style={[styles.bars, styles.axis]}>
        {bars.map((b, i) => (
          <Text
            key={b.date}
            variant="label"
            // Frames: every day text-tertiary, today text-primary and bold.
            color={b.today ? 'text-primary' : 'text-tertiary'}
            weight={b.today ? '700' : undefined}
            maxFontSizeMultiplier={fontScale.narrowLabel}
            style={styles.day}
          >
            {names[i]}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: 'row',
    gap: space[2],
    marginRight: GUTTER,
    height: '100%',
  },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { alignSelf: 'stretch', borderRadius: 2 },
  lineLabel: {
    position: 'absolute',
    right: 0,
    width: GUTTER - space[1],
    textAlign: 'right',
  },
  axis: { height: undefined, marginTop: space[1] },
  day: { flex: 1, textAlign: 'center' },
});
