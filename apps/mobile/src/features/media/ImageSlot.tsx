import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { ImageError } from '../../domain/attachments/upload';
import { useTheme } from '../../shared/theme';
import { FormMessage } from '../../shared/ui/FormMessage';

// The 96 photo of 07 S-ME-01 / 08 S-SET-01: tap to change; `uploading` dims it under a
// spinner; `upload-error` (type / size) sits underneath.
export function ImageSlot({
  label,
  uploading,
  error,
  disabled,
  onPress,
  children,
}: {
  label: string;
  uploading: boolean;
  error: ImageError | null;
  disabled: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, busy: uploading }}
        disabled={disabled}
        onPress={onPress}
      >
        <View style={uploading && styles.dim}>{children}</View>
        {uploading && (
          <View style={styles.spinner}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}
      </Pressable>
      {(error === 'type' || error === 'too-big') && (
        <FormMessage
          tone="error"
          text={t(error === 'type' ? 'me.uploadType' : 'me.uploadTooBig')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  dim: { opacity: 0.4 },
  spinner: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
