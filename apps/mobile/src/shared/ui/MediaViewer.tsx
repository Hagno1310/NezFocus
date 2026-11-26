import { Image, type ImageSource } from 'expo-image';
import { Download, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { motion, size, space, useTheme } from '../theme';
import { IconButton } from './Button';
import { Avatar } from './People';
import { Text } from './Text';
import { ToastHost } from './Toast';

export type ViewerImage = {
  key: string;
  source: ImageSource; // the original
  placeholder: ImageSource; // the thumbnail the chat already has (S-HOME-11 `loading`)
  name: string;
  detail: string; // "loi-giai-2.jpg · 1,2 MB"
};

// No spec value: zoom stops at 4×; a swipe down closes past 120 or faster than 800 / s, like
// the sheets' drag to dismiss.
const MAX_ZOOM = 4;
const TAP_SLOP = space[2];
const CLOSE_DRAG = 120;
const CLOSE_SPEED = 800;

// C-36 MediaViewer (S-HOME-11 `image`, `loading`): the images of one message, full screen on
// `bg` (not black, DESIGN.md › Colors). Swipe between them, pinch / double-tap to zoom, tap to
// hide the strips, swipe down / Back / `x` to close.
export function MediaViewer({
  images,
  start,
  sender,
  time,
  onClose,
  onDownload,
  onError,
}: {
  images: readonly ViewerImage[];
  start: number;
  sender: { name: string; avatarUri: string | null };
  time: string;
  onClose: () => void;
  onDownload: (index: number) => void;
  onError?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(start);
  const [chrome, setChrome] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const current = images[index];
  const many = images.length > 1;
  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView
        style={[styles.flex, { backgroundColor: colors.bg }]}
      >
        <FlatList
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          data={images}
          keyExtractor={(i) => i.key}
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item }) => (
            <Page
              image={item}
              width={width}
              onTap={() => setChrome((c) => !c)}
              onZoom={setZoomed}
              onClose={onClose}
              onError={onError}
            />
          )}
        />
        {chrome && current && (
          <View
            accessible
            accessibilityLabel={t('chat.viewer.a11yStrip', {
              index: index + 1,
              count: images.length,
              name: current.name,
              sender: sender.name,
              time,
            })}
            style={[
              styles.strip,
              {
                paddingTop: insets.top + space[1],
                backgroundColor: colors['surface-1'],
                borderBottomColor: colors.border,
              },
            ]}
          >
            <IconButton
              icon={X}
              label={t('chat.viewer.close')}
              color="text-primary"
              onPress={onClose}
            />
            <View
              style={styles.who}
              importantForAccessibility="no-hide-descendants"
            >
              <View style={styles.whoRow}>
                <Avatar
                  name={sender.name}
                  uri={sender.avatarUri}
                  size={size.avatar[1]}
                />
                <Text weight="600" numberOfLines={1} style={styles.shrink}>
                  {sender.name}
                </Text>
                <Text variant="label" weight="400" color="text-tertiary">
                  {`· ${time}`}
                </Text>
              </View>
              <Text
                variant="label"
                weight="400"
                color="text-secondary"
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {current.detail}
              </Text>
            </View>
            <IconButton
              icon={Download}
              label={t('chat.viewer.download')}
              color="text-primary"
              onPress={() => onDownload(index)}
            />
          </View>
        )}
        {chrome && many && (
          <Text
            variant="label"
            weight="400"
            color="text-secondary"
            style={[styles.count, { bottom: insets.bottom + space[3] }]}
            accessibilityElementsHidden
          >
            {t('chat.viewer.count', { index: index + 1, count: images.length })}
          </Text>
        )}
        {/* The app's host sits under this Modal window: "Đã lưu vào Tải xuống" shows here. */}
        <ToastHost />
      </GestureHandlerRootView>
    </Modal>
  );
}

function Page({
  image,
  width,
  onTap,
  onZoom,
  onClose,
  onError,
}: {
  image: ViewerImage;
  width: number;
  onTap: () => void;
  onZoom: (zoomed: boolean) => void;
  onClose: () => void;
  onError?: () => void;
}) {
  const { colors } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const scale = useSharedValue(1);
  const base = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const from = useSharedValue({ x: 0, y: 0 });
  const drag = useSharedValue(0);

  const zoomTo = (z: boolean) => {
    setZoomed(z);
    onZoom(z);
  };
  const settle = (to: number) => {
    'worklet';
    scale.set(withTiming(to, { duration: motion.short }));
    base.set(to);
    if (to === 1) {
      x.set(withTiming(0, { duration: motion.short }));
      y.set(withTiming(0, { duration: motion.short }));
    }
    scheduleOnRN(zoomTo, to > 1);
  };

  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      scale.set(Math.min(MAX_ZOOM, Math.max(1, base.get() * e.scale)));
    },
    onDeactivate: () => {
      'worklet';
      settle(scale.get() <= 1.05 ? 1 : scale.get());
    },
  });
  // A tap that moved is a swipe between images, never a tap (else the strips hide).
  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    maxDistance: TAP_SLOP,
    onActivate: () => {
      'worklet';
      settle(base.get() > 1 ? 1 : 2);
    },
  });
  const tap = useTapGesture({
    maxDistance: TAP_SLOP,
    onActivate: () => {
      'worklet';
      scheduleOnRN(onTap);
    },
  });
  // Two pans, not one: zoomed, the image moves any way; not zoomed, sideways must stay with
  // the pager, so only a downward drag is ours.
  const move = usePanGesture({
    enabled: zoomed,
    onActivate: () => {
      'worklet';
      from.set({ x: x.get(), y: y.get() });
    },
    onUpdate: (e) => {
      'worklet';
      x.set(from.get().x + e.translationX);
      y.set(from.get().y + e.translationY);
    },
  });
  // Not zoomed: swipe down closes (S-HOME-11 › Tương tác); sideways belongs to the pager.
  const down = usePanGesture({
    enabled: !zoomed,
    activeOffsetY: space[3],
    failOffsetX: [-space[3], space[3]],
    onUpdate: (e) => {
      'worklet';
      drag.set(Math.max(0, e.translationY));
    },
    onDeactivate: (e) => {
      'worklet';
      if (e.translationY > CLOSE_DRAG || e.velocityY > CLOSE_SPEED)
        scheduleOnRN(onClose);
      else drag.set(withTiming(0, { duration: motion.short }));
    },
  });
  const taps = useExclusiveGestures(doubleTap, tap);
  const gesture = useSimultaneousGestures(pinch, move, down, taps);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(0.5, drag.get() / (CLOSE_DRAG * 4)),
    transform: [
      { translateX: x.get() },
      { translateY: y.get() + drag.get() },
      { scale: scale.get() },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width }, styles.page, style]}>
        <Image
          source={image.source}
          placeholder={image.placeholder}
          placeholderContentFit="contain"
          contentFit="contain"
          transition={0}
          style={StyleSheet.absoluteFill}
          onLoad={() => setLoaded(true)}
          onError={onError}
          accessible={false}
        />
        {!loaded && (
          <ActivityIndicator
            size={size.attachMark}
            color={colors['text-secondary']}
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  strip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[1],
    paddingBottom: space[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  who: { flex: 1, gap: 2 },
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  count: { position: 'absolute', alignSelf: 'center' },
});
