import { UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import {
  radius,
  size,
  space,
  useTheme,
  type ColorToken,
  type TypeVariant,
} from '../theme';
import { Icon } from './Icon';
import { badgeText, initial, stackAvatars } from './logic';
import { Text } from './Text';

export type AvatarSize = (typeof size.avatar)[number];
export type Presence = 'online' | 'idle' | 'dnd' | 'offline';

const initialType: Record<AvatarSize, TypeVariant> = {
  20: 'tab',
  24: 'tab',
  32: 'label',
  40: 'body',
  56: 'title-2',
  96: 'display', // board C-13
};

// DESIGN.md › Presence: dot 10 on every avatar size, cut out of the background by 2.
const RING = size.presence.cut;
const DOT_BOX = size.presence.dot + RING * 2;
// The dot sits on the circle's edge at 45° (bottom-right), so it touches the avatar at any size.
const dotSpot = (s: AvatarSize) => {
  const at = (s / 2) * (1 + Math.SQRT1_2) - DOT_BOX / 2;
  return { left: at, top: at };
};

// C-13. `self` = the signed-in user (primary fill); `deleted` = default person glyph.
export function Avatar({
  name,
  uri,
  size: s = 40,
  self = false,
  deleted = false,
  presence,
  ring = 'bg',
}: {
  name: string;
  uri?: string | null;
  size?: AvatarSize;
  self?: boolean;
  deleted?: boolean;
  presence?: Presence;
  // Colour behind the avatar: used for the presence cut-out.
  ring?: ColorToken;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const label = deleted ? t('ui.deletedUser') : name;
  const fill = self && !deleted ? colors.primary : colors['surface-3'];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        presence ? `${label}, ${t(`ui.presence.${presence}`)}` : label
      }
      style={{ width: s, height: s }}
    >
      <View
        style={[styles.circle, { width: s, height: s, backgroundColor: fill }]}
      >
        {deleted ? (
          <Icon
            as={UserRound}
            // Board Avatar/deleted: 20 on the 40 avatar; scaled for the other sizes.
            size={s >= 56 ? 'xl' : s >= 40 ? 'md' : 'sm'}
            color="text-tertiary"
          />
        ) : uri ? (
          <Image source={{ uri }} style={{ width: s, height: s }} />
        ) : (
          <Text
            variant={initialType[s]}
            weight="600"
            color={self ? 'on-primary' : 'text-primary'}
            allowFontScaling={false}
          >
            {initial(name)}
          </Text>
        )}
      </View>
      {presence && (
        <View style={[styles.dotCorner, dotSpot(s)]}>
          <PresenceDot status={presence} ring={ring} />
        </View>
      )}
    </View>
  );
}

// Shape is the primary signal, colour secondary (DESIGN.md › Presence): solid · crescent · bar · hollow.
export function PresenceDot({
  status,
  ring = 'bg',
}: {
  status: Presence;
  ring?: ColorToken;
}) {
  const { colors } = useTheme();
  const d = size.presence.dot;
  const box = DOT_BOX;
  const c = box / 2;
  const r = d / 2;
  const cut = colors[ring];
  const tone = {
    online: colors.success,
    idle: colors.warning,
    dnd: colors.danger,
    offline: colors['text-tertiary'],
  }[status];
  return (
    <Svg width={box} height={box}>
      <Circle cx={c} cy={c} r={c} fill={cut} />
      {status === 'offline' ? (
        <Circle
          cx={c}
          cy={c}
          r={r - d * 0.15}
          fill={cut}
          stroke={tone}
          strokeWidth={d * 0.3}
        />
      ) : (
        <Circle cx={c} cy={c} r={r} fill={tone} />
      )}
      {status === 'idle' && (
        // Board PresenceDot/idle: cut-out r = 0.6 r, centred 0.6 r up-left of the dot.
        <Circle cx={c - r * 0.6} cy={c - r * 0.6} r={r * 0.6} fill={cut} />
      )}
      {status === 'dnd' && (
        <Rect
          x={c - r * 0.6}
          y={c - d * 0.1}
          width={r * 1.2}
          height={d * 0.2}
          rx={d * 0.1}
          fill={cut}
        />
      )}
    </Svg>
  );
}

export function AvatarStack({
  people,
  size: s = 24,
  ring = 'bg',
}: {
  people: { name: string; uri?: string | null }[];
  size?: AvatarSize;
  ring?: ColorToken;
}) {
  const { colors } = useTheme();
  const { shown, more } = stackAvatars(people);
  return (
    <View style={styles.stack}>
      {shown.map((p, i) => (
        <View
          key={`${p.name}-${i}`}
          style={[
            styles.stackItem,
            {
              marginLeft: i === 0 ? 0 : size.avatarStackOverlap,
              borderColor: colors[ring],
            },
          ]}
        >
          <Avatar name={p.name} uri={p.uri} size={s} />
        </View>
      ))}
      {more > 0 && (
        <Text variant="label" color="text-secondary" style={styles.more}>
          +{more}
        </Text>
      )}
    </View>
  );
}

// C-13 Badge. `count · neutral` is for pending reports (not red: red means unread / mention).
export function Badge({
  count,
  tone = 'danger',
}: {
  count: number | 'dot';
  tone?: 'danger' | 'neutral';
}) {
  const { colors } = useTheme();
  if (count === 'dot')
    return <View style={[styles.dot, { backgroundColor: colors.danger }]} />;
  const text = badgeText(count);
  if (!text) return null;
  const neutral = tone === 'neutral';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: neutral ? colors['surface-3'] : colors.danger },
      ]}
    >
      <Text
        variant="tab"
        weight="700"
        color={neutral ? 'text-primary' : 'bg'}
        allowFontScaling={false}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCorner: { position: 'absolute' },
  stack: { flexDirection: 'row', alignItems: 'center' },
  stackItem: { borderWidth: RING, borderRadius: radius.full },
  more: { marginLeft: space[1] },
  badge: {
    minWidth: size.badge,
    height: size.badge,
    paddingHorizontal: space[1],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: size.badgeDot,
    height: size.badgeDot,
    borderRadius: radius.full,
  },
});
