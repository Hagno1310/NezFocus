import { Image } from 'expo-image';
import { Check, FileX, RotateCw, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { UploadStatus } from '../../domain/attachments/uploads';
import { radius, size, space, touchSlop, useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export type TrayTile = {
  key: string;
  uri: string; // the photo on the phone: the preview from the start (NFR-MOB-07)
  name: string;
  status: UploadStatus;
  progress: number;
};

const TILE = size.attachTile;
const CLOSE = size.attachClose;
const RING = size.attachRing;
const STROKE = size.attachRingStroke;

// C-29: one row of 64 tiles over the input, scrolling sideways; the line under it (C-11 › Dòng
// dưới khay). A failed tile is tapped to retry; a blocked one can only be removed.
export function AttachmentTray({
  tiles,
  line,
  onRemove,
  onRetry,
}: {
  tiles: readonly TrayTile[];
  line: { text: string; danger: boolean } | null;
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
}) {
  if (!tiles.length) return null;
  return (
    <View style={styles.tray}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {tiles.map((tile) => (
          <Tile
            key={tile.key}
            tile={tile}
            onRemove={() => onRemove(tile.key)}
            onRetry={() => onRetry(tile.key)}
          />
        ))}
      </ScrollView>
      {line && (
        <Text
          variant="label"
          weight="400"
          color={line.danger ? 'danger' : 'text-secondary'}
          accessibilityLiveRegion="polite"
          style={styles.line}
        >
          {line.text}
        </Text>
      )}
    </View>
  );
}

function Tile({
  tile,
  onRemove,
  onRetry,
}: {
  tile: TrayTile;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { status } = tile;
  const broken =
    status === 'failed' || status === 'waiting' || status === 'rejected';
  const covered = status !== 'done';
  const label = t(`chat.attachA11y.${status}`, {
    name: tile.name,
    percent: Math.round(tile.progress * 100),
  });
  return (
    <View style={styles.tile}>
      <Pressable
        accessibilityRole={status === 'failed' ? 'button' : 'image'}
        accessibilityLabel={label}
        disabled={status !== 'failed' && status !== 'waiting'}
        onPress={onRetry}
        style={[
          styles.box,
          { backgroundColor: colors['surface-3'] },
          broken && {
            borderColor: colors.danger,
            borderWidth: size.strokeThick,
          },
        ]}
      >
        <Image
          source={{ uri: tile.uri }}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessible={false}
        />
        {covered && (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.center,
              { backgroundColor: colors.scrim },
            ]}
          >
            {status === 'uploading' && <Ring progress={tile.progress} />}
            {status === 'checking' && (
              <ActivityIndicator size="small" color={colors['text-primary']} />
            )}
            {(status === 'failed' || status === 'waiting') && (
              <>
                <Icon as={RotateCw} size="md" color="danger" />
                <Text variant="tab" color="danger">
                  {t('chat.attachRetry')}
                </Text>
              </>
            )}
            {status === 'rejected' && (
              <>
                <Icon as={FileX} size="md" color="danger" />
                <Text variant="tab" color="danger">
                  {t('chat.attachBlocked')}
                </Text>
              </>
            )}
          </View>
        )}
        {status === 'done' && (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <View style={[styles.mark, { backgroundColor: colors.primary }]}>
              <Icon as={Check} size="xs" color="on-primary" />
            </View>
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('chat.attachRemove', { name: tile.name })}
        hitSlop={touchSlop(CLOSE)}
        onPress={onRemove}
        style={[styles.close, { backgroundColor: colors.bg }]}
      >
        <Icon as={X} size="xs" color="text-primary" />
      </Pressable>
    </View>
  );
}

// C-29 `uploading`: a ring that fills with the bytes sent.
function Ring({ progress }: { progress: number }) {
  const { colors } = useTheme();
  const r = (RING - STROKE) / 2;
  const length = 2 * Math.PI * r;
  return (
    <Svg width={RING} height={RING} accessible={false}>
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={colors.border}
        strokeWidth={STROKE}
        fill="none"
      />
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={colors['text-primary']}
        strokeWidth={STROKE}
        fill="none"
        strokeDasharray={`${length} ${length}`}
        strokeDashoffset={length * (1 - progress)}
        strokeLinecap="round"
        transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  tray: { paddingTop: space[2] },
  row: { gap: space[2], paddingHorizontal: space[3] },
  line: { paddingHorizontal: space[3], paddingTop: space[1] + 2 },
  tile: { width: TILE, height: TILE },
  box: {
    width: TILE,
    height: TILE,
    borderRadius: radius.input,
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: size.attachInset,
  },
  mark: {
    width: size.attachMark,
    height: size.attachMark,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    top: size.attachInset,
    right: size.attachInset,
    width: CLOSE,
    height: CLOSE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
