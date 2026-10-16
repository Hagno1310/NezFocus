import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useBackendStatus } from '../hooks/useBackendStatus';

// Reference feature: copy features/_example to start a feature (screens/ + hooks/ + components/).
export function ExampleScreen() {
  const { data, isPending, refetch } = useBackendStatus();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NezFocus</Text>
      {isPending ? <ActivityIndicator /> : <Text>Backend: {data}</Text>}
      <Pressable
        accessibilityRole="button"
        onPress={() => refetch()}
        style={styles.button}
      >
        <Text>Kiểm tra lại</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '600' },
  button: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
});
