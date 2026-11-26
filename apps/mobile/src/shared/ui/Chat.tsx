import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  Clock3,
  Hash,
  Menu,
  Users,
} from 'lucide-react-native';
import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  motion,
  radius,
  size,
  space,
  touchSlop,
  useTheme,
  type ColorToken,
} from '../theme';
import { IconButton } from './Button';
import { Icon, type IconComponent } from './Icon';
import { MessageImages, type ChatImage } from './MessageImages';
import { Avatar } from './People';
import { Text } from './Text';

// C-04: 56 high with the sub-line too (19/11/2026); `right` stays empty for text (no 🔍 at MVP).
export function ChannelHeader({
  icon = Hash,
  leading,
  title,
  username,
  subtitle,
  subline,
  onPressTitle,
  onMenu,
  onMembers,
  right,
  topInset = true,
}: {
  icon?: IconComponent;
  // In place of the icon, e.g. the DM avatar (S-DM-02, P2-B3.3).
  leading?: ReactNode;
  title: string;
  username?: string; // C-04 `dm`: beside the name, gives way first (CR-25 #14)
  subtitle?: string;
  subline?: ReactNode; // C-04 `dm`: the full ActivityLine in place of the text
  onPressTitle?: () => void; // S-DM-02: avatar / name → S-HOME-10
  onMenu?: () => void;
  onMembers?: () => void;
  right?: ReactNode;
  topInset?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const inset = topInset ? top : 0;
  return (
    <View
      style={[
        styles.header,
        {
          minHeight: size.header + inset,
          paddingTop: inset,
          backgroundColor: colors.bg,
        },
      ]}
    >
      {onMenu && (
        <IconButton
          icon={Menu}
          label={t('chat.openChannels')}
          onPress={onMenu}
        />
      )}
      <Pressable
        accessible
        accessibilityRole="header"
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        disabled={!onPressTitle}
        onPress={onPressTitle}
        style={styles.headerTitle}
      >
        <View style={styles.titleRow}>
          {leading ?? <Icon as={icon} size="base" color="text-secondary" />}
          <Text variant="headline" numberOfLines={1} style={styles.shrink}>
            {title}
          </Text>
          {username && (
            <Text
              variant="label"
              color="text-tertiary"
              numberOfLines={1}
              style={styles.giveWay}
            >
              {username}
            </Text>
          )}
        </View>
        {subline ??
          (subtitle && (
            <Text variant="label" color="text-secondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ))}
      </Pressable>
      {right}
      {onMembers && (
        <IconButton
          icon={Users}
          label={t('chat.openMembers')}
          onPress={onMembers}
        />
      )}
    </View>
  );
}

export type MessageStatus =
  { kind: 'pending'; offline: boolean } | { kind: 'failed'; text: string };

// C-10: a flat row, never a bubble; padding 6 around a group head, 1 around a grouped one.
export function MessageBubble({
  name,
  avatarUri,
  self = false,
  deleted = false,
  time,
  head = true,
  reply,
  status,
  mention = false,
  surface,
  liftedTime,
  edited,
  reactions,
  highlight,
  accessibilityLabel,
  actions = [],
  onPress,
  onLongPress,
  onPressAuthor,
  images,
  children,
}: {
  name: string;
  avatarUri?: string | null;
  self?: boolean;
  deleted?: boolean;
  time: string;
  head?: boolean;
  // `reply` line above the name (P3-A1, #21).
  reply?: ReactNode;
  status?: MessageStatus;
  // Concerns me (CR-12): left bar 2 `primary` + `surface-1` (P2-A4.3, #105 decides when).
  mention?: boolean;
  // `lifted` copy over the scrim (S-HOME-04): `surface-2`.
  surface?: ColorToken;
  // C-10 `lifted` of a grouped message: its own "20:04" in the avatar column.
  liftedTime?: string;
  // "(đã chỉnh sửa)" on its own line under the text (frame `message-states`, 26/11/2026).
  edited?: string;
  reactions?: ReactNode; // C-10 `reaction` chips
  // C-10 `highlight`: the background flashes `times` (reply 1, link / push 2); a new `key`
  // flashes again.
  highlight?: { key: number; times: 1 | 2 };
  accessibilityLabel: string;
  // C-10: what the row offers a screen reader instead of its inner presses (links…).
  actions?: { label: string; onPress: () => void }[];
  onPress?: (e: GestureResponderEvent) => void;
  // Gets where the row sits on screen (its own ref: a long-press event's currentTarget is null
  // by the time it is read), for the `lifted` copy of S-HOME-04.
  onLongPress?: (at: { top: number }) => void;
  // Avatar / name → S-HOME-10 (P2-B3.4, #117).
  onPressAuthor?: () => void;
  // C-10 Ảnh under the text; long-pressing one is long-pressing the message.
  images?: {
    items: readonly ChatImage[];
    onOpen?: (index: number) => void;
    onError?: () => void;
  };
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pending = status?.kind === 'pending';
  const row = useRef<ComponentRef<typeof View>>(null);
  const longPress =
    onLongPress &&
    (() => row.current?.measureInWindow((_x, top) => onLongPress({ top })));
  return (
    <Pressable
      ref={row}
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={actions.map((a, i) => ({
        name: `a${i}`,
        label: a.label,
      }))}
      onAccessibilityAction={(e) =>
        actions[Number(e.nativeEvent.actionName.slice(1))]?.onPress()
      }
      onPress={onPress}
      onLongPress={longPress}
      disabled={!onPress && !onLongPress}
      style={[
        styles.message,
        { paddingVertical: head ? 6 : 1 },
        pending && styles.pending,
        surface && { backgroundColor: colors[surface] },
        mention && {
          backgroundColor: colors['surface-1'],
          borderLeftColor: colors.primary,
          borderLeftWidth: size.strokeThick,
          paddingLeft: space[3] - size.strokeThick,
        },
      ]}
    >
      {highlight && <Flash key={highlight.key} times={highlight.times} />}
      <Pressable
        disabled={!head || !onPressAuthor}
        onPress={onPressAuthor}
        importantForAccessibility="no-hide-descendants"
        style={[styles.avatarCell, !head && !liftedTime && styles.collapsed]}
      >
        {!head && liftedTime && (
          // One line in the 40 column even at 200% text: it shrinks instead of wrapping.
          <Text
            variant="label"
            weight="400"
            color="text-tertiary"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {liftedTime}
          </Text>
        )}
        {head && (
          <Avatar
            name={name}
            uri={avatarUri}
            self={self}
            deleted={deleted}
            size={size.avatar[3]}
          />
        )}
      </Pressable>
      <View
        style={styles.messageBody}
        importantForAccessibility="no-hide-descendants"
      >
        {head && reply}
        {head && (
          <View style={styles.messageHead}>
            <Text
              weight="600"
              numberOfLines={1}
              onPress={onPressAuthor}
              style={styles.shrink}
            >
              {name}
            </Text>
            <Text variant="label" weight="400" color="text-tertiary">
              {time}
            </Text>
          </View>
        )}
        {children}
        {images && (
          <MessageImages
            images={images.items}
            onOpen={images.onOpen}
            onLongPress={longPress}
            onError={images.onError}
          />
        )}
        {edited && (
          <Text variant="label" weight="400" color="text-tertiary">
            {edited}
          </Text>
        )}
        {reactions}
        {status?.kind === 'pending' && status.offline && (
          <StatusLine icon={Clock3} color="text-tertiary" weight="400">
            {t('chat.willSend')}
          </StatusLine>
        )}
        {status?.kind === 'failed' && (
          <StatusLine icon={CircleAlert} color="danger" weight="600">
            {status.text}
          </StatusLine>
        )}
      </View>
    </Pressable>
  );
}

// Each flash `short` on, `short` off; reduce motion: held 1 s, no flashing (C-10).
function Flash({ times }: { times: 1 | 2 }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const on = useSharedValue(0);
  useEffect(() => {
    on.set(
      reduced
        ? withSequence(
            withTiming(1, { duration: 0 }),
            withDelay(1000, withTiming(0, { duration: 0 })),
          )
        : withRepeat(
            withSequence(
              withTiming(1, { duration: motion.short }),
              withTiming(0, { duration: motion.short }),
            ),
            times,
          ),
    );
  }, [on, reduced, times]);
  const style = useAnimatedStyle(() => ({ opacity: on.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors['surface-2'] },
        style,
      ]}
    />
  );
}

function StatusLine({
  icon,
  color,
  weight,
  children,
}: {
  icon: IconComponent;
  color: ColorToken;
  weight: '400' | '600';
  children: string;
}) {
  return (
    <View style={styles.statusLine}>
      <Icon as={icon} size="xs" color={color} />
      <Text variant="label" weight={weight} color={color} style={styles.shrink}>
        {children}
      </Text>
    </View>
  );
}

// S-HOME-01 `new-messages`: 40 high, `surface-2`, under the header. The text jumps to the
// "Tin nhắn mới" line; the action marks the channel read.
export function UnreadStrip({
  text,
  action,
  onJump,
  onMarkRead,
}: {
  text: string;
  action: string;
  onJump: () => void;
  onMarkRead: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.strip, { backgroundColor: colors['surface-2'] }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onJump}
        style={styles.stripJump}
      >
        <Icon as={ArrowUp} size="sm" color="text-primary" />
        <Text
          variant="label"
          weight="600"
          numberOfLines={1}
          style={styles.shrink}
        >
          {text}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onMarkRead}
        hitSlop={touchSlop(size.banner)}
      >
        <Text variant="label" weight="600" color="primary">
          {action}
        </Text>
      </Pressable>
    </View>
  );
}

// C-10 `system` (REQ-MSG-11): icon 16 in the avatar column, `label` text with the names
// bold `text-primary`, then the time. `parts`: bold runs at odd positions.
export function SystemLine({
  icon,
  parts,
  time,
  accessibilityLabel,
  surface,
  onLongPress,
  deleteLabel,
  action,
}: {
  icon: IconComponent;
  parts: string[];
  time: string;
  accessibilityLabel: string;
  surface?: ColorToken; // `lifted` over the scrim (S-HOME-04 `system-message`)
  // S-HOME-04 `system-message`: only with MANAGE_MESSAGES (MSG-11); where the row sits.
  onLongPress?: (at: { top: number }) => void;
  deleteLabel?: string; // the same, for a screen reader
  // C-10 › Tin hệ thống: "· **Xem**" (`primary`, 600) after the sentence (a pin → the message).
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  const row = useRef<ComponentRef<typeof View>>(null);
  const a11yActions = [
    ...(action ? [{ name: 'activate', label: action.label }] : []),
    ...(onLongPress && deleteLabel
      ? [{ name: 'longpress', label: deleteLabel }]
      : []),
  ];
  return (
    <Pressable
      ref={row}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={a11yActions.length ? a11yActions : undefined}
      onAccessibilityAction={(e) =>
        e.nativeEvent.actionName === 'activate'
          ? action?.onPress()
          : row.current?.measureInWindow((_x, top) => onLongPress?.({ top }))
      }
      disabled={!onLongPress}
      onLongPress={
        onLongPress &&
        (() => row.current?.measureInWindow((_x, top) => onLongPress({ top })))
      }
      style={[
        styles.message,
        styles.systemRow,
        surface && { backgroundColor: colors[surface] },
      ]}
    >
      <View style={[styles.avatarCell, styles.systemIcon]}>
        <Icon as={icon} size="sm" color="text-tertiary" />
      </View>
      <Text
        variant="label"
        weight="400"
        color="text-secondary"
        style={styles.shrink}
      >
        {parts.map((part, i) =>
          i % 2 ? (
            <Text key={i} variant="label" weight="600">
              {part}
            </Text>
          ) : (
            part
          ),
        )}
        {action && (
          <>
            {' · '}
            <Text
              variant="label"
              weight="600"
              color="primary"
              onPress={action.onPress}
              suppressHighlighting
            >
              {action.label}
            </Text>
          </>
        )}
      </Text>
      <Text variant="label" weight="400" color="text-tertiary">
        {time}
      </Text>
    </Pressable>
  );
}

// C-10 `blocked` (FRIEND-03 AC2): "1 tin nhắn bị chặn · Hiện", under the content column.
export function BlockedLine({
  text,
  show,
  onShow,
}: {
  text: string;
  show: string;
  onShow: () => void;
}) {
  return (
    <View style={styles.blocked}>
      <Text variant="label" weight="400" color="text-tertiary">
        {text}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onShow}
        hitSlop={touchSlop(19)}
      >
        <Text variant="label" weight="600" color="primary">
          {show}
        </Text>
      </Pressable>
    </View>
  );
}

// Divider/date (board): "Hôm nay", "Thứ Năm, 15/10/2026". `danger` = Divider/new (P2-A4.4).
export function DateDivider({
  label,
  tone = 'text-tertiary',
}: {
  label: string;
  tone?: 'text-tertiary' | 'danger';
}) {
  const { colors } = useTheme();
  const line = [
    styles.dividerLine,
    { backgroundColor: tone === 'danger' ? colors.danger : colors.border },
  ];
  return (
    <View accessibilityRole="header" style={styles.divider}>
      <View style={line} />
      <Text variant="label" weight="600" color={tone}>
        {label}
      </Text>
      <View style={line} />
    </View>
  );
}

// S-HOME-01 `scrolled-up`: "3 tin mới ↓", or only ↓ while nothing new came.
export function JumpPill({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const text = count > 0 ? t('chat.newMessages', { count }) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text ?? t('chat.scrollDown')}
      onPress={onPress}
      hitSlop={touchSlop(PILL)}
      style={[
        styles.pill,
        {
          backgroundColor: colors['surface-3'],
          borderColor: colors.border,
        },
      ]}
    >
      {text && (
        <Text variant="label" weight="600">
          {text}
        </Text>
      )}
      <Icon as={ArrowDown} size="sm" color="text-primary" />
    </Pressable>
  );
}
const PILL = 36;

// S-HOME-01 `empty` and the top of every history: the channel start block, at the bottom.
export function ChannelStart({ name }: { name: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.start}>
      <View
        style={[styles.startIcon, { backgroundColor: colors['surface-2'] }]}
      >
        <Icon as={Hash} size="xxl" color="text-primary" />
      </View>
      <Text variant="title-2" accessibilityRole="header">
        {t('chat.channelStartTitle', { name })}
      </Text>
      <Text color="text-secondary">{t('chat.channelStartBody')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  giveWay: { flexShrink: 1000 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[1],
  },
  headerTitle: { flex: 1, paddingHorizontal: space[1] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] + 2 },
  message: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: space[3],
  },
  pending: { opacity: 0.5 },
  strip: {
    height: size.banner,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
  },
  stripJump: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  systemRow: { paddingVertical: 6, alignItems: 'center' },
  systemIcon: { alignItems: 'center' },
  blocked: {
    flexDirection: 'row',
    gap: space[1],
    paddingVertical: 6,
    paddingRight: space[3],
    // Under the content column: 16 + avatar 40 + 12.
    paddingLeft: space[3] + size.avatar[3] + 12,
  },
  avatarCell: { width: size.avatar[3] },
  collapsed: { height: 0 },
  messageBody: { flex: 1, gap: 2 },
  messageHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space[2],
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: size.iconGap,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  dividerLine: { flex: 1, height: size.hairline },
  pill: {
    height: PILL,
    flexDirection: 'row',
    alignItems: 'center',
    gap: size.iconGap,
    paddingHorizontal: 14,
    borderWidth: size.hairline,
    borderRadius: radius.full,
  },
  start: {
    gap: space[2],
    paddingTop: space[3],
    paddingHorizontal: space[3],
    paddingBottom: space[4],
  },
  startIcon: {
    width: size.avatar[4],
    height: size.avatar[4],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
