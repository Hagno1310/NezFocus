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
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { prepareImage } from '../../data/attachments/prepareImage';
import type { ImageFile } from '../../domain/attachments/AttachmentRepository';
import { clampOffset, cropRect } from '../../domain/attachments/crop';
import { darkColors, size, space } from '../../shared/theme';
import { Button } from '../../shared/ui/Button';
import { Text } from '../../shared/ui/Text';
import { showErrorToast } from '../auth/hooks/useAuthActions';

const MAX_ZOOM = 4;
// Frame `crop`: a 310 ring on the 390 frame, 40 from each edge; the photo shows past it.
const RING_INSET = space[5] + space[2];

// 07 S-ME-01 `crop` (also the server icon, 08 S-SET-01): always the dark theme. The photo covers the circle's box; drag and pinch
// move it, never far enough to leave a gap inside the circle.
export function CropImageScreen({
  photo,
  shape = 'circle',
  onCancel,
  onDone,
}: {
  photo: { uri: string; width: number; height: number };
  // circle: avatars (07 S-ME-01); square: server icons (08 S-SET-01 "crop vuông").
  shape?: 'circle' | 'square';
  onCancel: () => void;
  onDone: (file: ImageFile) => void;
}) {
  const { t } = useTranslation();
  const { width: screen } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const side = screen - RING_INSET * 2;
  const img = { width: photo.width, height: photo.height };
  const fit = side / Math.min(img.width, img.height);

  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const start = useSharedValue({ scale: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState({ width: 0, height: 0 });

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
  // Scrim over the whole stage but the hole (frame `crop`: "phủ `scrim` ở cả bốn phía"),
  // drawn at the stage's own size: a larger SVG crashed Android ("bitmap too large").
  const w = stage.width;
  const h = stage.height;
  const cx = w / 2;
  const cy = h / 2;
  const hole =
    shape === 'circle'
      ? `M${cx} ${cy - r}A${r} ${r} 0 1 0 ${cx} ${cy + r}A${r} ${r} 0 1 0 ${cx} ${cy - r}Z`
      : `M${cx - r} ${cy - r}H${cx + r}V${cy + r}H${cx - r}Z`;
  const mask = `M0 0H${w}V${h}H0Z ${hole}`;
  const ring = size.strokeThick;

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: darkColors.bg,
          paddingTop: top,
          paddingBottom: bottom,
        },
      ]}
    >
      <View style={styles.bar}>
        <Text
          variant="headline"
          style={[styles.title, { color: darkColors['text-primary'] }]}
          pointerEvents="none"
          accessibilityRole="header"
        >
          {t('me.cropTitle')}
        </Text>
        <Button
          variant="text"
          size="S"
          tone="neutral"
          label={t('me.cancel')}
          disabled={busy}
          onPress={onCancel}
        />
        <Button
          variant="text"
          size="S"
          label={t('me.cropUse')}
          loading={busy}
          onPress={() => void use()}
        />
      </View>

      <GestureDetector gesture={gesture}>
        <View
          style={styles.stage}
          onLayout={(e) =>
            setStage({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
        >
          <View style={{ width: side, height: side }}>
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
          </View>
          {w > 0 && (
            <Svg
              width={w}
              height={h}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Path d={mask} fill={darkColors.scrim} fillRule="evenodd" />
              {shape === 'circle' ? (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={r - ring / 2}
                  stroke={darkColors['text-primary']}
                  strokeWidth={ring}
                  fill="none"
                />
              ) : (
                <Rect
                  x={cx - r + ring / 2}
                  y={cy - r + ring / 2}
                  width={side - ring}
                  height={side - ring}
                  stroke={darkColors['text-primary']}
                  strokeWidth={ring}
                  fill="none"
                />
              )}
            </Svg>
          )}
        </View>
      </GestureDetector>

      <Text
        variant="label"
        style={[styles.hint, { color: darkColors['text-secondary'] }]}
      >
        {t('me.cropHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    height: size.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[1],
  },
  // Centred on the screen whatever the two buttons' widths (frame `crop`).
  title: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { width: '100%', height: '100%' },
  hint: { textAlign: 'center', paddingVertical: space[3] },
});
