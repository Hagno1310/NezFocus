import type { ServerSummary } from '@nezfocus/shared';
import { StyleSheet, View } from 'react-native';
import { railInitials } from '../../../domain/servers/drawer';
import { radius, useTheme } from '../../../shared/theme';
import { Text } from '../../../shared/ui/Text';

// C-26 server tile without a picture (icons come after P1): initials on `surface-2`.
export function ServerIcon({
  server,
  size,
}: {
  server: Pick<ServerSummary, 'name'>;
  size: 40 | 48 | 96;
}) {
  const { colors } = useTheme();
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
      <Text
        variant={size === 96 ? 'title-1' : 'label'}
        weight="700"
        allowFontScaling={false}
      >
        {railInitials(server.name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
