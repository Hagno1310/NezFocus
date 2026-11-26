import { Image, type ImageSource } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, size, space, useTheme } from '../theme';

export type ChatImage = {
  key: string;
  source: ImageSource; // thumbnail of a sent image, or the photo on the phone while pending
  width: number | null;
  height: number | null;
};

const { maxWidth, maxHeight, cellWidth, cellHeight } = size.image;
const GAP = space[1];

// C-10 Ảnh: one keeps its ratio within 240 × 320; several are a 2-column grid of 100 × 75
// cells (frame `attachments`, chốt 26/11/2026). Tapping one opens C-36 at it; long-press is the
// message's.
export function MessageImages({
  images,
  onOpen,
  onLongPress,
  onError,
}: {
  images: readonly ChatImage[];
  onOpen?: (index: number) => void;
  onLongPress?: () => void;
  onError?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!images.length) return null;
  const one = images.length === 1 ? fit(images[0]!) : null;
  return (
    <View style={[styles.grid, !one && styles.cells]}>
      {images.map((image, i) => (
        <Pressable
          key={image.key}
          accessibilityRole="imagebutton"
          accessibilityLabel={t('chat.a11yImage', {
            index: i + 1,
            count: images.length,
          })}
          disabled={!onOpen}
          onPress={() => onOpen?.(i)}
          onLongPress={onLongPress}
          style={[
            styles.image,
            { backgroundColor: colors['surface-2'] },
            one ?? styles.cell,
          ]}
        >
          <Image
            source={image.source}
            contentFit="cover"
            transition={0}
            style={StyleSheet.absoluteFill}
            accessible={false}
            onError={onError}
          />
        </Pressable>
      ))}
    </View>
  );
}

function fit({ width, height }: ChatImage) {
  if (!width || !height) return { width: maxWidth, height: cellHeight * 2 };
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

const styles = StyleSheet.create({
  grid: { paddingTop: space[1] },
  cells: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    width: cellWidth * 2 + GAP,
  },
  image: { borderRadius: radius.button, overflow: 'hidden' },
  cell: { width: cellWidth, height: cellHeight },
});
