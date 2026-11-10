import type { FocusPhase } from '@nezfocus/shared';
import { Coffee, LampDesk, Pause } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import {
  fontScale,
  radius,
  size,
  space,
  useTheme,
  type ColorToken,
} from '../theme';
import { Moon, Icon, type IconComponent } from './Icon';
import { arcDash, clockText } from './logic';
import { Text } from './Text';

// Pause and the Solo wait are not phases: they keep the phase colour and stroke (C-06).
export type PhaseState = 'running' | 'paused' | 'waiting';

export const phaseColor: Record<FocusPhase, ColorToken> = {
  focus: 'phase-focus',
  short_break: 'phase-short',
  long_break: 'phase-long',
};

export const phaseRoomColor: Record<FocusPhase, ColorToken> = {
  focus: 'phase-focus-room',
  short_break: 'phase-short-room',
  long_break: 'phase-long-room',
};

export const phaseIcon: Record<FocusPhase, IconComponent> = {
  focus: LampDesk,
  short_break: Coffee,
  long_break: Moon,
};

// C-16, kiểu `live` and size M. `list` lands with S-STUDY-01 (P1-B3.4, #87).
export function PhaseBadge({
  phase,
  state = 'running',
  size: s,
  label,
  time,
}: {
  phase: FocusPhase;
  state?: PhaseState;
  size: 'S' | 'M';
  label: string;
  time?: string;
}) {
  const color: ColorToken =
    state === 'paused' ? 'text-secondary' : phaseColor[phase];
  const icon =
    state === 'paused'
      ? Pause
      : state === 'waiting'
        ? Coffee
        : phaseIcon[phase];
  return (
    <View style={styles.badge}>
      <Icon as={icon} size={s === 'S' ? 'xs' : 'base'} color={color} />
      <Text
        variant={s === 'S' ? 'label' : 'body'}
        weight="600"
        color={color}
        numberOfLines={1}
        style={styles.shrink}
      >
        {label}
      </Text>
      {time && (
        <Text variant="numeric-inline" color={color}>
          {time}
        </Text>
      )}
    </View>
  );
}

// Board C-06 (FocusTimer/focus, /short, /long): ring 280, band = 7% of the radius.
export const RING = 280;
const MID = RING / 2;
const BAND = MID * 0.07;
// Short break: 30 dashes of 6.6° every 12°, each one coloured whole as the break goes on.
const DASHES = 30;
const DASH_TURN = 6.6 / 360;
// Long break, "vòng đôi": two thin rings (outer 280, inner 252), band 3.5% of each radius.
const DOUBLE = [MID, 126].map((outer) => ({
  r: outer - outer * 0.0175,
  w: outer * 0.035,
}));

// `from`/`to`: the coloured share of the turn, clockwise from 12 o'clock.
export function Ring({
  phase,
  from,
  to,
}: {
  phase: FocusPhase;
  from: number;
  to: number;
}) {
  const { colors } = useTheme();
  const color = colors[phaseColor[phase]];
  // SVG circles start at 3 o'clock; C-06 anchors the arc at 12 o'clock.
  const circle = (r: number, w: number, stroke: string, dash: number[]) => (
    <Circle
      key={`${r}-${dash[1]}-${stroke}`}
      cx={MID}
      cy={MID}
      r={r}
      strokeWidth={w}
      fill="none"
      stroke={stroke}
      strokeDasharray={dash}
      transform={`rotate(-90 ${MID} ${MID})`}
    />
  );
  const span = (r: number, w: number, stroke: string, a: number, b: number) => {
    const c = 2 * Math.PI * r;
    return circle(r, w, stroke, arcDash(c, a * c, b * c));
  };

  if (phase === 'short_break') {
    const r = MID - BAND / 2;
    const [k0, k1] = [Math.round(from * DASHES), Math.round(to * DASHES)];
    return (
      <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
        {Array.from({ length: DASHES }, (_, i) =>
          span(
            r,
            BAND,
            i >= k0 && i < k1 ? color : colors.border,
            i / DASHES,
            i / DASHES + DASH_TURN,
          ),
        )}
      </Svg>
    );
  }
  const rings =
    phase === 'long_break' ? DOUBLE : [{ r: MID - BAND / 2, w: BAND }];
  return (
    <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
      {rings.map(({ r, w }) => (
        <G key={r}>
          {span(r, w, colors.border, 0, 1)}
          {span(r, w, color, from, to)}
        </G>
      ))}
    </Svg>
  );
}

// C-06 · ring. `left`/`total` drive the arc: focus empties clockwise, a break fills clockwise.
export function FocusTimer({
  phase,
  state,
  leftMs,
  totalMs,
  label,
  lines,
  long,
  accessibilityLabel,
  mascot,
}: {
  phase: FocusPhase;
  state: PhaseState;
  leftMs: number;
  totalMs: number;
  label: string;
  lines: string[];
  long: boolean;
  accessibilityLabel: string;
  mascot?: ReactNode;
}) {
  const share = totalMs > 0 ? Math.min(1, leftMs / totalMs) : 0;
  // C-06: a break fills up and ends full, so the Solo wait after it shows a full ring.
  const [from, to] =
    state === 'waiting'
      ? [0, 1]
      : phase === 'focus'
        ? [1 - share, 1]
        : [0, 1 - share];
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={accessibilityLabel}
      style={styles.ring}
    >
      <Ring phase={phase} from={from} to={to} />
      {mascot}
      <PhaseBadge phase={phase} state={state} size="M" label={label} />
      <Text variant={long ? 'timer-long' : 'timer'}>{clockText(leftMs)}</Text>
      {lines.map((line) => (
        <Text
          key={line}
          variant="label"
          color="text-secondary"
          numberOfLines={2}
          maxFontSizeMultiplier={fontScale.narrowLabel}
          style={styles.line}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

// C-17: round control, never a phase or primary colour. `main` = the 64 one (Tạm dừng / Tiếp tục).
export function RoomControl({
  icon,
  label,
  main = false,
  onPress,
}: {
  icon: IconComponent;
  label: string;
  main?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const diameter = main ? size.controlMain : size.control;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.control}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.controlDisc,
              {
                width: diameter,
                height: diameter,
                backgroundColor: main
                  ? colors['text-primary']
                  : colors['surface-2'],
                borderColor: main ? colors['text-primary'] : colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <Icon as={icon} size="xl" color={main ? 'bg' : 'text-primary'} />
          </View>
          <Text
            variant="label"
            color="text-secondary"
            numberOfLines={2}
            maxFontSizeMultiplier={fontScale.narrowLabel}
            style={styles.line}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// C-08: sits right on top of the TabBar; tapping the text reopens the session.
export function MiniPlayer({
  icon,
  title,
  line,
  actions,
  onOpen,
}: {
  icon: ReactNode;
  title: string;
  line: ReactNode;
  actions: ReactNode;
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.mini,
        { backgroundColor: colors['surface-2'], borderTopColor: colors.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onOpen}
        style={styles.miniText}
      >
        {icon}
        <View style={styles.flex}>
          <Text variant="body" weight="600" numberOfLines={1}>
            {title}
          </Text>
          {line}
        </View>
      </Pressable>
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  // Cut inside the parent, never past its edge (04 › large-text).
  shrink: { flexShrink: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: size.iconGap },
  ring: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
  },
  line: { textAlign: 'center', maxWidth: 236 }, // board: FT cycle width
  control: {
    alignItems: 'center',
    gap: space[1],
    width: size.controlMain + space[3],
  },
  controlDisc: {
    borderRadius: radius.full,
    borderWidth: size.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.96 }] },
  mini: {
    height: size.miniPlayer,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: size.hairline,
    paddingHorizontal: space[3],
    gap: space[2],
  },
  miniText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + space[1],
  },
  flex: { flex: 1 },
});
