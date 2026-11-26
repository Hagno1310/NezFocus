import { Mic, MicOff, WifiLow } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { awayOpacity, motion, radius, size, space, useTheme } from '../theme';
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
});
