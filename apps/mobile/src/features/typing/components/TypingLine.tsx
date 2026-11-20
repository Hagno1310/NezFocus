import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useStore } from 'zustand';
import { typingLine, typingStore } from '../../../domain/typing/typing';
import { space } from '../../../shared/theme';
import { Text } from '../../../shared/ui/Text';

// S-HOME-01 `default` › Typing (REQ-MSG-06); weight 400: the frame overrides the label token's 500.
export function TypingLine({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const typers = useStore(typingStore.state, (s) => s[channelId]);
  const line = typingLine(typers?.map((x) => x.name) ?? []);
  if (!line) return null;
  return (
    <View
      style={{
        paddingTop: space[1],
        paddingHorizontal: space[3],
      }}
      accessibilityLiveRegion="polite"
    >
      <Text
        variant="label"
        color="text-secondary"
        weight="400"
        numberOfLines={1}
      >
        {t(line.key, line.values)}
      </Text>
    </View>
  );
}
