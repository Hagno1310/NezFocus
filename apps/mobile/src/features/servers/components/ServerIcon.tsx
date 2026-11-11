import type { ServerSummary } from '@nezfocus/shared';
import { Image, StyleSheet, View } from 'react-native';
import { mediaUri } from '../../../data/api/media';
import { railInitials } from '../../../domain/servers/drawer';
import { radius, useTheme } from '../../../shared/theme';
import { Text } from '../../../shared/ui/Text';

// C-26 server tile: the icon (REQ-SRV-01, P1-A4.7 #211), else initials on `surface-2`.
// `uri` overrides it (a picked icon not uploaded yet, S-HOME-06).
export function ServerIcon({
  server,
  size,
  uri,
}: {
  server: Pick<ServerSummary, 'name'> & { icon_url?: string | null };
  size: 40 | 48 | 96;
  uri?: string | null;
}) {
  const { colors } = useTheme();
  const picture = uri ?? mediaUri(server.icon_url);
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size === 96 ? radius.sheet : radius.server,
          backgroundColor: colors['surface-2'],
        },
      ]}
    >
      {picture ? (
        <Image
          source={{ uri: picture }}
          style={{ width: size, height: size }}
        />
      ) : (
        <Text
          variant={size === 96 ? 'title-1' : 'label'}
          weight="700"
          allowFontScaling={false}
        >
          {railInitials(server.name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
