import {
  ArrowDown,
  CircleAlert,
  Clock3,
  Hash,
  Menu,
  Users,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  radius,
  size,
  space,
  touchSlop,
  useTheme,
  type ColorToken,
} from '../theme';
import { IconButton } from './Button';
import { Icon, type IconComponent } from './Icon';
import { Avatar } from './People';
import { Text } from './Text';

// C-04 ChannelHeader. 56 high with the sub-line too (19/11/2026); grows with large text.
// `right`: the slot before 👥 (empty for a text channel at MVP: no 🔍).
export function ChannelHeader({
  icon = Hash,
  leading,
  title,
  subtitle,
  onMenu,
  onMembers,
  right,
  topInset = true,
}: {
  icon?: IconComponent;
  // In place of the icon, e.g. the DM avatar (S-DM-02, P2-B3.3).
  leading?: ReactNode;
  title: string;
  subtitle?: string;
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
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
        style={styles.headerTitle}
      >
        <View style={styles.titleRow}>
          {leading ?? <Icon as={icon} size="base" color="text-secondary" />}
          <Text variant="headline" numberOfLines={1} style={styles.shrink}>
            {title}
          </Text>
        </View>
        {subtitle && (
          <Text variant="label" color="text-secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
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

// C-10 MessageBubble: a flat row, never a bubble. `head` = first of its group (avatar, name,
// time); spacing from the master: 6 above and below a head, 1 around a grouped message.
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
  accessibilityLabel,
  onPress,
  onLongPress,
  onPressAuthor,
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
  accessibilityLabel: string;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  // Avatar / name → S-HOME-10 (P2-B3.4, #117).
  onPressAuthor?: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pending = status?.kind === 'pending';
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
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
      <Pressable
        disabled={!head || !onPressAuthor}
        onPress={onPressAuthor}
        importantForAccessibility="no-hide-descendants"
        style={[styles.avatarCell, !head && !liftedTime && styles.collapsed]}
      >
        {!head && liftedTime && (
          <Text variant="label" weight="400" color="text-tertiary">
            {liftedTime}
          </Text>
        )}
        {head && (
          <Avatar
            name={name}
            uri={avatarUri}
            self={self}
            deleted={deleted}
            size={40}
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
        <Hash size={28} color={colors['text-primary']} strokeWidth={2} />
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
  avatarCell: { width: size.avatar[3] },
  collapsed: { height: 0 },
  messageBody: { flex: 1, gap: 2 },
  messageHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space[2],
  },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
