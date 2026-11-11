import type { StyleProp, TextStyle } from 'react-native';
import { Text } from './Text';

// Group label above a block of rows ("CÀI ĐẶT", "VÙNG NGUY HIỂM", "THIẾT BỊ NÀY"):
// `label` 600 `text-tertiary`, as drawn on S-ME-02 / S-ME-03.
export function SectionLabel({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      variant="label"
      weight="600"
      color="text-tertiary"
      accessibilityRole="header"
      style={style}
    >
      {children}
    </Text>
  );
}
