import { Text as RNText, type TextProps } from 'react-native';
import {
  fontScale,
  typography,
  useTheme,
  type ColorToken,
  type TypeVariant,
} from '../theme';

const headings: TypeVariant[] = ['display', 'title-1', 'title-2', 'headline'];
// DESIGN.md › Cỡ chữ 200%: timers are already ≥ 32 and never scale.
const fixed: TypeVariant[] = ['timer', 'timer-long', 'stat'];

export type AppTextProps = TextProps & {
  variant?: TypeVariant;
  color?: ColorToken;
  weight?: '400' | '500' | '600' | '700' | '800';
};

export function Text({
  variant = 'body',
  color = 'text-primary',
  weight,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={
        headings.includes(variant) ? fontScale.heading : undefined
      }
      allowFontScaling={!fixed.includes(variant)}
      {...rest}
      style={[
        typography[variant],
        { color: colors[color] },
        weight && { fontWeight: weight },
        style,
      ]}
    />
  );
}
