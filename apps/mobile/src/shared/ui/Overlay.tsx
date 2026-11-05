import { Check } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
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
import { Button, type ButtonProps } from './Button';
import { FormMessage } from './FormMessage';
import { Icon, type IconComponent } from './Icon';
import { dialogLayout } from './logic';
import { Text } from './Text';
import { exitMs, fadeIn, fadeOut, sheetEnter, sheetExit } from './transitions';
import { overlayClosed, overlayOpened } from './Toast';

// Drag distance / speed that closes a sheet on release.
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 800;

function Overlay({
  visible,
  onDismiss,
  dismissible,
  placement,
  children,
}: {
  visible: boolean;
  onDismiss: () => void;
  dismissible: boolean;
  placement: 'center' | 'bottom';
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
      <GestureHandlerRootView style={styles.flex}>
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
          <View
            pointerEvents="box-none"
            style={[
              styles.flex,
              placement === 'center' ? styles.center : styles.bottom,
            ]}
          >
            {visible && children}
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

export type DialogAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger';
  loading?: boolean;
};

// C-09: confirmation without inputs. `cancel` omitted = single-button dialog.
export function Dialog({
  visible,
  title,
  body,
  confirm,
  cancel,
  error,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  body?: string;
  confirm: DialogAction;
  cancel?: { label: string; onPress: () => void };
  error?: string | null;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const layout = dialogLayout(
    cancel ? [cancel.label, confirm.label] : [confirm.label],
  );
  const busy = !!confirm.loading;
  const confirmButton = (
    <Button
      label={confirm.label}
      variant={confirm.variant ?? 'primary'}
      loading={busy}
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
        >
          <Text variant="headline" accessibilityRole="header">
            {title}
          </Text>
          {body && <Text color="text-secondary">{body}</Text>}
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
  error,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  children?: ReactNode;
  action?: ButtonProps;
  error?: string | null;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const busy = !!action?.loading;
  return (
    <Overlay
      visible={visible}
      onDismiss={onDismiss}
      dismissible={!busy}
      placement="bottom"
    >
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
            {handle}
            <View style={styles.sheetBody}>
              <Text variant="title-2" accessibilityRole="header">
                {title}
              </Text>
              <ScrollView
                style={styles.shrink}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
              {error && <FormMessage tone="error" text={error} />}
              {action && <Button size="L" fullWidth {...action} />}
            </View>
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
};

export type ActionGroup = { title?: string; items: ActionItem[] };

// C-09 ActionSheet (board master): floating card of groups, Cancel in its own card below.
export function ActionSheet({
  visible,
  title,
  subtitle,
  groups,
  onDismiss,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  groups: ActionGroup[];
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const card = [
    styles.actionCard,
    { backgroundColor: colors['surface-1'] },
    sheetShadow(colors),
  ];
  return (
    <Overlay
      visible={visible}
      onDismiss={onDismiss}
      dismissible
      placement="bottom"
    >
      <SheetFrame
        onDismiss={onDismiss}
        dismissible
        handleGap={space[1]}
        style={styles.actionSheet}
      >
        {(handle) => (
          <>
            <View style={[card, styles.actionGroups]}>
              {handle}
              {(title || subtitle) && (
                <View style={styles.actionHead}>
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ui.cancel')}
              onPress={onDismiss}
              style={({ pressed }) => [
                card,
                styles.actionCancel,
                pressed && { backgroundColor: colors['surface-2'] },
              ]}
            >
              <Text weight="600">{t('ui.cancel')}</Text>
            </Pressable>
          </>
        )}
      </SheetFrame>
    </Overlay>
  );
}

function ActionRow({
  item,
  pickOne = false,
}: {
  item: ActionItem;
  pickOne?: boolean;
}) {
  const { colors } = useTheme();
  const tone: ColorToken = item.destructive ? 'danger' : 'text-primary';
  return (
    <Pressable
      accessibilityRole={pickOne ? 'radio' : 'button'}
      accessibilityLabel={item.label}
      accessibilityState={pickOne ? { selected: !!item.selected } : undefined}
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && { backgroundColor: colors['overlay-pressed'] },
      ]}
    >
      <Icon
        as={item.icon}
        size="lg"
        color={item.destructive ? 'danger' : 'text-secondary'}
      />
      <Text color={tone} style={styles.flex}>
        {item.label}
      </Text>
      {pickOne && item.selected && (
        <Icon as={Check} size="md" color="primary" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  // Board ActionSheet: outer padding 8 (24 at the bottom), cards radius 24, gap 8.
  actionSheet: {
    maxHeight: '90%',
    paddingHorizontal: space[2],
    paddingTop: space[2],
    gap: space[2],
  },
  actionCard: { borderRadius: radius.sheet },
  actionGroups: { paddingBottom: space[2], flexShrink: 1 },
  actionHead: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    gap: space[1] / 2,
  },
  actionCancel: {
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
