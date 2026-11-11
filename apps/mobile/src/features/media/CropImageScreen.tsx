import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { prepareImage } from '../../data/attachments/prepareImage';
import type { ImageFile } from '../../domain/attachments/AttachmentRepository';
import { clampOffset, cropRect } from '../../domain/attachments/crop';
import { darkColors, size, space } from '../../shared/theme';
import { Button } from '../../shared/ui/Button';
import { Text } from '../../shared/ui/Text';
import { showErrorToast } from '../auth/hooks/useAuthActions';

const MAX_ZOOM = 4;

// 07 S-ME-01 `crop` (also the server icon, 08 S-SET-01): always the dark theme. The photo covers the circle's box; drag and pinch
// move it, never far enough to leave a gap inside the circle.
export function CropImageScreen({
  photo,
  onCancel,
  onDone,
}: {
  photo: { uri: string; width: number; height: number };
  onCancel: () => void;
  onDone: (file: ImageFile) => void;
}) {
  const { t } = useTranslation();
  const { width: screen } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const side = screen - space[3] * 2;
  const img = { width: photo.width, height: photo.height };
  const fit = side / Math.min(img.width, img.height);

  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const start = useSharedValue({ scale: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const pinch = usePinchGesture({
    onActivate: () => {
      'worklet';
      start.set({ scale: scale.get(), x: x.get(), y: y.get() });
    },
    onUpdate: (e) => {
      'worklet';
      const s = Math.min(MAX_ZOOM, Math.max(1, start.get().scale * e.scale));
      const at = clampOffset(img, side, s, x.get(), y.get());
      scale.set(s);
      x.set(at.x);
      y.set(at.y);
    },
  });
  const pan = usePanGesture({
    onActivate: () => {
      'worklet';
      start.set({ scale: scale.get(), x: x.get(), y: y.get() });
    },
    onUpdate: (e) => {
      'worklet';
      const at = clampOffset(
        img,
        side,
        scale.get(),
        start.get().x + e.translationX,
        start.get().y + e.translationY,
      );
      x.set(at.x);
      y.set(at.y);
    },
  });
  const gesture = useSimultaneousGestures(pinch, pan);

  const moved = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: scale.get() },
    ],
  }));

  const use = async () => {
    setBusy(true);
    try {
      const rect = cropRect(img, side, scale.get(), x.get(), y.get());
      onDone(await prepareImage(photo.uri, rect));
    } catch {
      showErrorToast('other');
      setBusy(false);
    }
  };

  const r = side / 2;
  // Scrim everywhere but the circle (even-odd: the circle cuts a hole in the square).
  const mask = `M0 0H${side}V${side}H0Z M${r} 0A${r} ${r} 0 1 0 ${r} ${side}A${r} ${r} 0 1 0 ${r} 0Z`;

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: darkColors.bg,
          paddingTop: top,
          paddingBottom: bottom + space[3],
        },
      ]}
    >
      <View style={styles.bar}>
        <Button
          variant="text"
          size="S"
          label={t('me.cancel')}
          disabled={busy}
          onPress={onCancel}
        />
        <Text
          variant="headline"
          style={[styles.title, { color: darkColors['text-primary'] }]}
          accessibilityRole="header"
        >
          {t('me.cropTitle')}
        </Text>
        <View style={styles.barSpacer} />
      </View>

      <View style={styles.middle}>
        <GestureDetector gesture={gesture}>
          <View style={[styles.box, { width: side, height: side }]}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: img.width * fit,
                  height: img.height * fit,
                  left: (side - img.width * fit) / 2,
                  top: (side - img.height * fit) / 2,
                },
                moved,
              ]}
            >
              <Image source={{ uri: photo.uri }} style={styles.fill} />
            </Animated.View>
            <Svg
              width={side}
              height={side}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Path d={mask} fill={darkColors.scrim} fillRule="evenodd" />
              <Circle
                cx={r}
                cy={r}
                r={r - size.strokeThick / 2}
                stroke={darkColors['text-primary']}
                strokeWidth={size.strokeThick}
                fill="none"
              />
            </Svg>
          </View>
        </GestureDetector>
        <Text
          variant="label"
          style={[styles.hint, { color: darkColors['text-secondary'] }]}
        >
          {t('me.cropHint')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          size="L"
          fullWidth
          label={t('me.cropUse')}
          loading={busy}
          onPress={() => void use()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    height: size.header,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[1],
  },
  title: { flex: 1, textAlign: 'center' },
  barSpacer: { width: 64 },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
  },
  box: { overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  hint: { textAlign: 'center' },
  footer: { paddingHorizontal: space[3] },
});
