import { Mic, MicOff, Video, WifiLow } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  awayOpacity,
  motion,
  radius,
  size,
  space,
  touchSlop,
  useTheme,
} from '../theme';
import { Icon } from './Icon';
import { Avatar } from './People';
import { Text } from './Text';

export type TileMic = 'on' | 'mod-muted' | null; // C-07: only a mic that is on, or mod-muted

// C-07 `video`: 3:4, camera over the tile or the 56 avatar centred above the name strip.
export function ParticipantTile({
  name,
  avatar,
  self = false,
  mic,
  speaking = false,
  away = false,
  poorNetwork = false,
  video,
  width,
}: {
  name: string;
  avatar?: string | null;
  self?: boolean;
  mic: TileMic;
  speaking?: boolean;
  away?: boolean;
  poorNetwork?: boolean; // C-07 `poor-network` (REQ-VC-05)
  video?: ReactNode; // the camera view, already mirrored for `self`
  width: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const ring = useSharedValue(speaking ? 1 : 0);
  // DESIGN.md › speaking-ring: shows at once, fades out `short`; never blinks.
  useEffect(() => {
    ring.set(
      speaking ? 1 : reduced ? 0 : withTiming(0, { duration: motion.short }),
    );
  }, [speaking, reduced, ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));
  const height = (width * 4) / 3;
  const shown = self ? t('voice.you') : name;
  return (
    <View
      accessible
      accessibilityLabel={[
        shown,
        mic === 'on' && t('voice.tile.micOn'),
        mic === 'mod-muted' && t('voice.modMuted'),
        speaking && t('voice.tile.speaking'),
        away && t('voice.tile.away'),
      ]
        .filter(Boolean)
        .join(', ')}
      style={[
        styles.tile,
        {
          width,
          height,
          backgroundColor: colors['surface-2'],
          opacity: away ? awayOpacity : 1,
        },
      ]}
    >
      {video ?? (
        <View style={[styles.avatarArea, { bottom: size.videoTileBar }]}>
          <Avatar name={name} uri={avatar} size={56} self={self} />
        </View>
      )}
      <View style={[styles.bar, { backgroundColor: colors.scrim }]}>
        <Text
          variant="label"
          weight="600"
          numberOfLines={1}
          style={styles.name}
        >
          {shown}
        </Text>
        {mic && (
          <Icon
            as={mic === 'on' ? Mic : MicOff}
            size="xs"
            color={mic === 'on' ? 'text-primary' : 'text-tertiary'}
          />
        )}
        {poorNetwork && <Icon as={WifiLow} size="xs" color="text-tertiary" />}
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.ring,
          { borderColor: colors['text-primary'] },
          ringStyle,
        ]}
      />
    </View>
  );
}

// C-07 `ring` (40): mic bottom-right, camera bottom-left, both cut out of the background behind.
export function RingSeat({
  name,
  avatar,
  self = false,
  mic,
  camera = false,
  speaking = false,
  away = false,
  behind,
}: {
  name: string;
  avatar?: string | null;
  self?: boolean;
  mic: TileMic;
  camera?: boolean;
  speaking?: boolean;
  away?: boolean;
  behind: string; // the room's phase colour, for the cut-outs
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const ring = useSharedValue(speaking ? 1 : 0);
  useEffect(() => {
    ring.set(
      speaking ? 1 : reduced ? 0 : withTiming(0, { duration: motion.short }),
    );
  }, [speaking, reduced, ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));
  const shown = self ? t('voice.you') : name;
  const badge = (icon: typeof Mic, side: 'left' | 'right', dim = false) => (
    <View
      style={[
        styles.seatBadge,
        side === 'left' ? styles.badgeLeft : styles.badgeRight,
        { backgroundColor: colors['surface-3'], borderColor: behind },
      ]}
    >
      <Icon
        as={icon}
        size="xxs"
        color={dim ? 'text-tertiary' : 'text-primary'}
      />
    </View>
  );
  return (
    <View
      accessible
      accessibilityLabel={[
        shown,
        mic === 'on' && t('voice.tile.micOn'),
        mic === 'mod-muted' && t('voice.modMuted'),
        camera && t('voice.tile.cameraOn'),
        speaking && t('voice.tile.speaking'),
        away && t('voice.tile.away'),
      ]
        .filter(Boolean)
        .join(', ')}
      style={[styles.seat, { opacity: away ? awayOpacity : 1 }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.seatRing,
          { borderColor: colors['text-primary'] },
          ringStyle,
        ]}
      />
      <Avatar name={name} uri={avatar} size={SEAT} self={self} />
      {camera && badge(Video, 'left')}
      {mic && badge(mic === 'on' ? Mic : MicOff, 'right', mic !== 'on')}
    </View>
  );
}

// C-07 `ring-more`: the last seat of a room of 13 or more.
export function RingMore({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('room.more', { count })}
      onPress={onPress}
      hitSlop={touchSlop(SEAT)}
      style={[
        styles.seat,
        styles.more,
        {
          backgroundColor: colors['surface-2'],
          borderColor: colors['border-input'],
        },
      ]}
    >
      <Text variant="label" weight="600">
        +{count}
      </Text>
    </Pressable>
  );
}

export const SEAT = 40;
// C-06: seat centres 152 from the ring's centre at 390; at 360 "on the circumference" (144) to
// keep the 16 margin.
export const seatRadius = (width: number) =>
  Math.min(152, width / 2 - SEAT / 2 - space[3]);

// C-06 › Xếp ghế: evenly around the ring, the first at 12 o'clock, then clockwise; seats slide to
// their new places in `medium` (Giảm chuyển động: at once). `breath` changes at a phase change:
// "Cả phòng thở ra", each seat breathes 40 ms after the one before (DESIGN.md › Motion).
export function SeatRing({
  radius,
  center,
  seats,
  breath = 0,
}: {
  radius: number;
  center: ReactNode;
  seats: { key: string; node: ReactNode }[];
  breath?: number;
}) {
  const side = radius * 2 + SEAT;
  return (
    <View style={{ width: side, height: side }}>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{center}</View>
      {seats.map((s, i) => (
        <SeatSpot
          key={s.key}
          angle={(i / seats.length) * 2 * Math.PI}
          radius={radius}
          breath={breath}
          delay={i * BREATH_STAGGER_MS}
        >
          {s.node}
        </SeatSpot>
      ))}
    </View>
  );
}

const BREATH_STAGGER_MS = 40;
const BREATH_SCALE = 1.12;

function SeatSpot({
  angle,
  radius,
  breath,
  delay,
  children,
}: {
  angle: number;
  radius: number;
  breath: number;
  delay: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!breath || reduced) return;
    scale.set(
      withDelay(
        delay,
        withSequence(
          withTiming(BREATH_SCALE, { duration: motion.medium / 2 }),
          withTiming(1, { duration: motion.medium / 2 }),
        ),
      ),
    );
  }, [breath, delay, reduced, scale]);
  const x = radius + radius * Math.sin(angle);
  const y = radius - radius * Math.cos(angle);
  const left = useSharedValue(x);
  const top = useSharedValue(y);
  useEffect(() => {
    const move = (v: number) =>
      reduced ? v : withTiming(v, { duration: motion.medium });
    left.set(move(x));
    top.set(move(y));
  }, [x, y, reduced, left, top]);
  const style = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
    transform: [{ scale: scale.value }],
  }));
  return <Animated.View style={[styles.spot, style]}>{children}</Animated.View>;
}

// C-18: two columns of 3:4 tiles (`gridTileWidth`), `space-2` apart; a third tile starts the
// next row on the left.
export function VideoGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

// C-18: one tile takes the whole width, more share two columns.
export const gridTileWidth = (width: number, count: number) =>
  count === 1 ? width : (width - space[2]) / 2;

const styles = StyleSheet.create({
  tile: { borderRadius: radius.button, overflow: 'hidden' },
  avatarArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: size.videoTileBar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: size.iconGap,
    paddingHorizontal: space[2],
  },
  name: { flex: 1 },
  // DESIGN.md › speaking-ring on a video tile: a 2 border.
  ring: { borderRadius: radius.button, borderWidth: size.strokeThick },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  seat: { width: SEAT, height: SEAT },
  // DESIGN.md › speaking-ring: a 2 gap around the avatar.
  seatRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: radius.full,
    borderWidth: size.strokeThick,
  },
  seatBadge: {
    position: 'absolute',
    bottom: -4,
    width: size.badge,
    height: size.badge,
    borderRadius: radius.full,
    borderWidth: size.strokeThick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLeft: { left: -4 },
  badgeRight: { right: -4 },
  more: {
    borderRadius: radius.full,
    borderWidth: size.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  spot: { position: 'absolute' },
});
