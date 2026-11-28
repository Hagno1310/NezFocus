import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import {
  motion,
  radius,
  sheetShadow,
  size,
  space,
  useTheme,
  type ColorToken,
} from '../theme';
import { Button, IconButton, type ButtonProps } from './Button';
import { FormMessage } from './FormMessage';
import { Icon, type IconComponent } from './Icon';
import { dialogLayout } from './logic';
import { Text } from './Text';
import {
  exitMs,
  fadeIn,
  fadeOut,
  lampOn,
  sheetEnter,
  sheetExit,
} from './transitions';
import { overlayClosed, overlayOpened, ToastHost } from './Toast';
import { interacted } from '../interaction';

// Drag distance / speed that closes a sheet on release.
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 800;

// `top`: window y of the row (measureInWindow); the Modal draws under the status bar too.
export type Lifted = { top: number; node: ReactNode };

// The sheet reports where it sits, so the lifted row can stay clear of it.
const SheetLayout = createContext<((e: LayoutChangeEvent) => void) | undefined>(
  undefined,
);

function Overlay({
  visible,
  onDismiss,
  dismissible,
  placement,
  lifted,
  children,
}: {
  visible: boolean;
  onDismiss: () => void;
  dismissible: boolean;
  placement: 'center' | 'bottom';
  lifted?: Lifted;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  // The Modal outlives `visible` by one exit so the unmounting content can animate out.
  const [lingering, setLingering] = useState(visible);
  if (visible && !lingering) setLingering(true);
  useEffect(() => {
    if (visible) return;
    const id = setTimeout(() => setLingering(false), exitMs);
    return () => clearTimeout(id);
  }, [visible]);
  const shown = visible || lingering;

  // S-HOME-04 `failed-message`: the lifted row sits just above the sheet when the sheet would cover it.
  const [sheetTop, setSheetTop] = useState<number | null>(null);
  const [liftedHeight, setLiftedHeight] = useState<number | null>(null);
  const liftedTop =
    lifted && sheetTop !== null && liftedHeight !== null
      ? Math.min(lifted.top, sheetTop - liftedHeight)
      : null;

  // S-MOD-04: no toast over a sheet or dialog, including while it fades out.
  useEffect(() => {
    if (!shown) return;
    overlayOpened();
    return overlayClosed;
  }, [shown]);

  const close = () => {
    if (visible && dismissible) onDismiss();
  };
  return (
    <Modal
      transparent
      visible={shown}
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      // SRS 3.1: Android Back closes the sheet / dialog first.
      onRequestClose={close}
    >
      {/* Gotcha: a Modal is a separate native root, so gestures need their own root view. */}
      {/* A Modal is its own window: touches never reach App's root, so report them here too. */}
      <GestureHandlerRootView style={styles.flex} onTouchStart={interacted}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          {visible && (
            <Animated.View
              entering={fadeIn}
              exiting={fadeOut}
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.scrim },
              ]}
            >
              <Pressable
                style={styles.flex}
                onPress={close}
                importantForAccessibility="no"
              />
            </Animated.View>
          )}
          {visible && lifted && (
            <Animated.View
              entering={fadeIn}
              exiting={fadeOut}
              pointerEvents="none"
              onLayout={(e) => setLiftedHeight(e.nativeEvent.layout.height)}
              style={[
                styles.lifted,
                {
                  top: liftedTop ?? lifted.top,
                  opacity: liftedTop === null ? 0 : 1,
                },
              ]}
            >
              {lifted.node}
            </Animated.View>
          )}
          <View
            pointerEvents="box-none"
            style={[
              styles.flex,
              placement === 'center' ? styles.center : styles.bottom,
            ]}
          >
            <SheetLayout.Provider
              value={(e) => setSheetTop(e.nativeEvent.layout.y)}
            >
              {visible && children}
            </SheetLayout.Provider>
          </View>
        </KeyboardAvoidingView>
        {/* A toast marked `overOverlay` sits above this window's scrim. */}
        <ToastHost />
      </GestureHandlerRootView>
    </Modal>
  );
}

export type DialogAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger';
  loading?: boolean;
  // Really impossible now (08 › Edge case P2: kick / ban against a role just raised, 40301).
  disabled?: boolean;
};

// C-09: confirmation without inputs. `cancel` omitted = single-button dialog.
export function Dialog({
  visible,
  title,
  body,
  confirm,
  cancel,
  error,
  children,
  row = false,
  stacked = false,
  onDismiss,
  lifted,
}: {
  visible: boolean;
  title: string;
  body?: string;
  // S-HOME-04 `delete-confirm`: the message stays lifted over the scrim, under the dialog.
  lifted?: Lifted;
  confirm: DialogAction;
  cancel?: { label: string; onPress: () => void };
  // Side by side whatever the label length, where a frame overrides C-09's stacking rule
  // (07 S-ME-01 `discard-confirm`).
  row?: boolean;
  // Stacked, full width, whatever the label length (02 S-HOME-09 `owner-leave`, 01 S-AUTH-04
  // `pending-deletion`: "hai nút xếp dọc").
  stacked?: boolean;
  error?: string | null;
  // One input under the text (08 S-SET-06 `category-rename`).
  children?: ReactNode;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const layout = row
    ? 'row'
    : stacked
      ? 'column'
      : dialogLayout(cancel ? [cancel.label, confirm.label] : [confirm.label]);
  const busy = !!confirm.loading;
  const confirmButton = (
    <Button
      label={confirm.label}
      variant={confirm.variant ?? 'primary'}
      loading={busy}
      disabled={confirm.disabled}
      onPress={confirm.onPress}
      fullWidth={layout === 'column'}
    />
  );
  const cancelButton = cancel && (
    <Button
      label={cancel.label}
      variant={layout === 'row' ? 'text' : 'secondary'}
      disabled={busy}
      onPress={cancel.onPress}
      fullWidth={layout === 'column'}
    />
  );
  return (
    <Overlay
      visible={visible}
      onDismiss={onDismiss}
      dismissible={!busy}
      placement="center"
      lifted={lifted}
    >
      <Animated.View
        entering={fadeIn}
        exiting={fadeOut}
        accessibilityViewIsModal
        style={[
          styles.dialog,
          { backgroundColor: colors['surface-1'] },
          sheetShadow(colors),
        ]}
      >
        {/* C-09 checklist: at 200% the content scrolls, the buttons stay visible. */}
        <ScrollView
          style={styles.shrink}
          contentContainerStyle={styles.dialogText}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="headline" accessibilityRole="header">
            {title}
          </Text>
          {body && <Text color="text-secondary">{body}</Text>}
          {children}
        </ScrollView>
        {error && <FormMessage tone="error" text={error} />}
        {layout === 'row' ? (
          <View style={styles.rowActions}>
            {cancelButton}
            {confirmButton}
          </View>
        ) : (
          <View style={styles.columnActions}>
            {confirmButton}
            {cancelButton}
          </View>
        )}
      </Animated.View>
    </Overlay>
  );
}

// `children` gets the drag handle so each sheet can place it inside its own card.
function SheetFrame({
  onDismiss,
  dismissible,
  handleGap,
  style,
  children,
}: {
  onDismiss: () => void;
  dismissible: boolean;
  // Board distance from the handle to the content below it.
  handleGap: number;
  style: StyleProp<ViewStyle>;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const onLayout = useContext(SheetLayout);
  // Render once with the fade exit before closing, so a dragged sheet does not snap back.
  const [dragged, setDragged] = useState(false);
  const dismissFromDrag = () => {
    setDragged(true);
    requestAnimationFrame(onDismiss);
  };
  const drag = useSharedValue(0);
  const pan = usePanGesture({
    activeOffsetY: space[2],
    enabled: dismissible,
    onUpdate: (e) => {
      'worklet';
      drag.set(Math.max(0, e.translationY));
    },
    onDeactivate: (e) => {
      'worklet';
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(dismissFromDrag);
      } else {
        drag.set(withTiming(0, { duration: motion.short }));
      }
    },
  });
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drag.get() }],
  }));

  // Boards draw the handle 8 below the sheet top; the row is taller so it is easy to grab.
  const handle = (
    <GestureDetector gesture={pan}>
      <View style={[styles.handleRow, { marginBottom: handleGap - space[2] }]}>
        <View
          style={[styles.handle, { backgroundColor: colors['border-input'] }]}
        />
      </View>
    </GestureDetector>
  );

  return (
    <Animated.View
      entering={sheetEnter(reduced)}
      exiting={sheetExit(reduced, dragged)}
      accessibilityViewIsModal
      onLayout={onLayout}
      style={[style, { paddingBottom: insets.bottom + space[4] }, dragStyle]}
    >
      {children(handle)}
    </Animated.View>
  );
}

// C-09: overlay with inputs or a choice list; sits above the keyboard.
export function BottomSheet({
  visible,
  title,
  children,
  action,
  secondary,
  error,
  notice,
  noticeIcon,
  icon,
  onBack,
  onDismiss,
  above,
  titleRight,
  band,
  bandAction,
}: {
  visible: boolean;
  title?: string; // none: S-HOME-10 starts with the avatar
  // S-HOME-10 (C-41): a coloured banner behind the handle, the avatar straddles its edge;
  // `lamp` lights it from the top right while the person studies (the phase colour).
  band?: { tone: ColorToken; lamp: ColorToken | null };
  // Top right of the banner (S-HOME-10 ⋯, chốt 25/11/2026).
  bandAction?: ReactNode;
  children?: ReactNode;
  action?: ButtonProps;
  // Under the main button (S-MOD-03 "Hủy").
  secondary?: ButtonProps;
  error?: string | null;
  // Neutral FormMessage above the button (S-SET-09 `limit`).
  notice?: string | null;
  // The notice's own icon (S-MOD-03 `password-rate-limited` clock-3, `password-reset-done` circle-check).
  noticeIcon?: IconComponent;
  // 32 above the title (S-MOD-03 `trash-2` danger). `circle`: the permission sheets
  // (10 S-MOD-05) put it in a 64 `surface-2` circle and centre the title; the caller
  // centres its own text.
  icon?: { as: IconComponent; color: ColorToken; circle?: boolean };
  // `chevron-left` before the title: the same sheet showing a sub-list (S-SET-09 `category-picker`).
  onBack?: () => void;
  onDismiss: () => void;
  // Sits on the sheet's top edge, 8 above it (S-HOME-07 `copied` toast).
  above?: ReactNode;
  // Right of the title (S-STUDY-02 `friends-sheet` "6 bạn", chốt 20/11/2026).
  titleRight?: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const busy = !!action?.loading;
  return (
    <Overlay
      visible={visible}
      onDismiss={onDismiss}
      dismissible={!busy}
      placement="bottom"
    >
      {above && <View style={styles.above}>{above}</View>}
      <SheetFrame
        onDismiss={onDismiss}
        dismissible={!busy}
        handleGap={space[3]}
        style={[
          styles.sheet,
          { backgroundColor: colors['surface-1'] },
          sheetShadow(colors),
        ]}
      >
        {(handle) => (
          <>
            {band && <Banner tone={band.tone} lamp={band.lamp} />}
            {handle}
            {band && bandAction && (
              <View style={styles.bandAction}>{bandAction}</View>
            )}
            <View style={styles.sheetBody}>
              {icon &&
                (icon.circle ? (
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: colors['surface-2'] },
                    ]}
                  >
                    <Icon as={icon.as} size="hero" color={icon.color} />
                  </View>
                ) : (
                  <Icon as={icon.as} size="hero" color={icon.color} />
                ))}
              {title !== undefined && (
                <View style={styles.sheetTitle}>
                  {onBack && (
                    <IconButton
                      icon={ChevronLeft}
                      label={t('ui.back')}
                      onPress={onBack}
                    />
                  )}
                  <Text
                    variant="title-2"
                    accessibilityRole="header"
                    style={[styles.flex, icon?.circle && styles.centerText]}
                  >
                    {title}
                  </Text>
                  {titleRight}
                </View>
              )}
              <ScrollView
                style={styles.shrink}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
              {notice && (
                <FormMessage tone="info" icon={noticeIcon} text={notice} />
              )}
              {error && <FormMessage tone="error" text={error} />}
              {action && <Button size="L" fullWidth {...action} />}
              {secondary && (
                <Button variant="text" size="L" fullWidth {...secondary} />
              )}
            </View>
          </>
        )}
      </SheetFrame>
    </Overlay>
  );
}

// A bare bottom sheet: handle, then the caller's own layout and scrolling (C-25 EmojiPicker
// in S-HOME-04 `emoji-picker`, which keeps the lifted message over the scrim).
export function PlainSheet({
  visible,
  onDismiss,
  lifted,
  children,
}: {
  visible: boolean;
  onDismiss: () => void;
  lifted?: Lifted;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Overlay
      visible={visible}
      onDismiss={onDismiss}
      dismissible
      placement="bottom"
      lifted={lifted}
    >
      <SheetFrame
        onDismiss={onDismiss}
        dismissible
        handleGap={space[2]}
        style={[
          styles.sheet,
          styles.actionSheet,
          { backgroundColor: colors['surface-1'] },
          sheetShadow(colors),
        ]}
      >
        {(handle) => (
          <>
            {handle}
            {children}
          </>
        )}
      </SheetFrame>
    </Overlay>
  );
}

export type ActionItem = {
  label: string;
  icon: IconComponent;
  onPress: () => void;
  destructive?: boolean;
  selected?: boolean;
  disabled?: boolean; // e.g. offline (chốt 25/11/2026): shown, not pressable
  hint?: string; // the reason under a disabled row (S-HOME-04 offline: "Cần kết nối mạng")
  chevron?: boolean; // opens a sheet or a screen (S-SET-03 "Tạm khóa ›")
};

export type ActionGroup = { title?: string; items: ActionItem[] };

// C-09 ActionSheet (board master): floating card of groups, Cancel in its own card below.
export function ActionSheet({
  visible,
  title,
  subtitle,
  icon,
  leading,
  groups,
  cancel = true,
  onDismiss,
  lifted,
  top,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  // Beside the title (08 `channel-menu`: the channel icon; 02 `category-menu`: folder).
  icon?: IconComponent;
  // In place of the icon, e.g. the server tile of 02 S-HOME-09.
  leading?: ReactNode;
  groups: ActionGroup[];
  // false: no Cancel card; drag down, the scrim or system Back close it (spec 02 S-HOME-09,
  // spec 08 `channel-menu`, 02 `category-menu`).
  cancel?: boolean;
  onDismiss: () => void;
  // C-09 "Nhấn giữ một hàng": the row drawn again over the scrim, where it sits on screen.
  lifted?: Lifted;
  // Under the handle, above the rows: S-HOME-04's quick reactions, with a hairline below.
  top?: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Overlay
      visible={visible}
      onDismiss={onDismiss}
      dismissible
      placement="bottom"
      lifted={lifted}
    >
      <SheetFrame
        onDismiss={onDismiss}
        dismissible
        handleGap={space[1]}
        // Chốt 21/11/2026: one sheet edge to edge and down to the screen bottom, nothing shows under it.
        style={[
          styles.sheet,
          styles.actionSheet,
          { backgroundColor: colors['surface-1'] },
          sheetShadow(colors),
        ]}
      >
        {(handle) => (
          <>
            <View style={styles.actionGroups}>
              {handle}
              {(title || subtitle) && (
                <View
                  // Frames S-HOME-09 / S-HOME-02 menus: a hairline `border` under the head.
                  style={[
                    styles.actionHead,
                    { borderBottomColor: colors.border },
                    !!(icon || leading) && styles.actionHeadRow,
                  ]}
                >
                  {leading}
                  {!leading && icon && (
                    <View
                      style={[
                        styles.actionHeadIcon,
                        { backgroundColor: colors['surface-2'] },
                      ]}
                    >
                      <Icon as={icon} size="lg" color="text-secondary" />
                    </View>
                  )}
                  {/* flex only beside an icon: alone in a column it collapses to 0 high. */}
                  <View style={icon || leading ? styles.flex : undefined}>
                    {title && (
                      <Text variant="headline" numberOfLines={1}>
                        {title}
                      </Text>
                    )}
                    {subtitle && (
                      <Text variant="label" color="text-secondary">
                        {subtitle}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              {top && (
                <View
                  style={[
                    styles.actionTop,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  {top}
                </View>
              )}
              <ScrollView style={styles.shrink}>
                {groups.map((g, gi) => (
                  <View
                    key={g.title ?? gi}
                    accessibilityRole={g.title ? 'radiogroup' : undefined}
                  >
                    {g.title && (
                      <View style={styles.groupTitle}>
                        <Text
                          variant="label"
                          weight="600"
                          color="text-tertiary"
                        >
                          {g.title}
                        </Text>
                      </View>
                    )}
                    {g.items.map((item) => (
                      <ActionRow
                        key={item.label}
                        item={item}
                        pickOne={!!g.title}
                      />
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
            {cancel && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('ui.cancel')}
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.actionCancel,
                  { borderTopColor: colors.border },
                  pressed && { backgroundColor: colors['overlay-pressed'] },
                ]}
              >
                <Text weight="600">{t('ui.cancel')}</Text>
              </Pressable>
            )}
          </>
        )}
      </SheetFrame>
    </Overlay>
  );
}

// One ActionSheet row, also used in a sheet's own list (S-HOME-10 `moderator-voice`).
export function ActionRow({
  item,
  pickOne = false,
}: {
  item: ActionItem;
  pickOne?: boolean;
}) {
  const { colors } = useTheme();
  const tone: ColorToken = item.disabled
    ? 'text-tertiary'
    : item.destructive
      ? 'danger'
      : 'text-primary';
  return (
    <Pressable
      accessibilityRole={pickOne ? 'radio' : 'button'}
      accessibilityLabel={
        item.disabled && item.hint ? `${item.label}, ${item.hint}` : item.label
      }
      accessibilityState={
        pickOne
          ? { selected: !!item.selected }
          : item.disabled
            ? { disabled: true }
            : undefined
      }
      disabled={item.disabled}
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && { backgroundColor: colors['overlay-pressed'] },
      ]}
    >
      <Icon
        as={item.icon}
        size="lg"
        color={
          item.disabled
            ? 'text-tertiary'
            : item.destructive
              ? 'danger'
              : 'text-secondary'
        }
      />
      <View style={styles.flex}>
        <Text color={tone}>{item.label}</Text>
        {item.disabled && item.hint && (
          <Text variant="label" color="text-tertiary">
            {item.hint}
          </Text>
        )}
      </View>
      {pickOne && item.selected && (
        <Icon as={Check} size="md" color="primary" />
      )}
      {item.chevron && (
        <Icon as={ChevronRight} size="md" color="text-tertiary" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionTop: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: space[2],
  },
  above: { marginHorizontal: space[3], marginBottom: space[2] },
  flex: { flex: 1 },
  lifted: { position: 'absolute', left: 0, right: 0 },
  shrink: { flexGrow: 0, flexShrink: 1 },
  center: { justifyContent: 'center', alignItems: 'center', padding: space[3] },
  bottom: { justifyContent: 'flex-end' },
  dialog: {
    width: '100%',
    maxWidth: size.dialogMax,
    maxHeight: '90%',
    borderRadius: radius.sheet,
    padding: space[4],
    gap: space[3],
  },
  dialogText: { gap: space[3] },
  rowActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space[2],
  },
  columnActions: { gap: space[2] },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space[3],
  },
  handleRow: {
    height: space[2] * 2 + size.handle.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: size.handle.width,
    height: size.handle.height,
    borderRadius: radius.full,
  },
  sheetBody: { gap: space[3], flexShrink: 1 },
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: size.profileBand,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
  },
  bandAction: {
    position: 'absolute',
    top: space[3] - space[1],
    right: space[3] - space[1],
  },
  sheetTitle: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  iconCircle: {
    width: size.icon.hero * 2,
    height: size.icon.hero * 2,
    borderRadius: size.icon.hero,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  centerText: { textAlign: 'center' },
  // Chốt 21/11/2026 (00-components): one edge-to-edge sheet, not the board's floating cards.
  actionSheet: { paddingHorizontal: 0 },
  actionGroups: { paddingBottom: space[2], flexShrink: 1 },
  actionHead: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    gap: space[1] / 2,
    borderBottomWidth: size.hairline,
  },
  actionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  actionHeadIcon: {
    width: size.avatar[3],
    height: size.avatar[3],
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCancel: {
    borderTopWidth: size.hairline,
    height: size.actionRow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    height: size.groupTitle,
    justifyContent: 'center',
    paddingHorizontal: space[3],
  },
  actionRow: {
    minHeight: size.actionRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[3],
  },
});

// C-41 Background/default: the person's tone; while they study, a desk lamp in the phase
// colour glows from the top right (DESIGN.md: only the shared rhythm is lit).
function Banner({ tone, lamp }: { tone: ColorToken; lamp: ColorToken | null }) {
  const { colors, scheme } = useTheme();
  return (
    <View style={styles.band} pointerEvents="none">
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors[tone] }]}
      />
      {lamp && (
        <Animated.View entering={lampOn} style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient
                id="lamp"
                cx="82%"
                cy="0%"
                rx="65%"
                ry="130%"
                fx="82%"
                fy="0%"
              >
                {/* Gotcha: react-native-svg ignores the alpha of an #RRGGBBAA stop colour. */}
                <Stop
                  offset="0"
                  stopColor={colors[lamp]}
                  stopOpacity={scheme === 'dark' ? 0.35 : 0.22}
                />
                <Stop offset="1" stopColor={colors[lamp]} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#lamp)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}
