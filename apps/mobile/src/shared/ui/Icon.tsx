import type { LucideIcon } from 'lucide-react-native';
import { size as sizes, useTheme, type ColorToken } from '../theme';

// DESIGN.md: icons are lucide; spec names (`octagon-x`) map to the PascalCase export (OctagonX).
export type IconComponent = LucideIcon;

export function Icon({
  as: Glyph,
  size = 'xl',
  color = 'text-secondary',
}: {
  as: IconComponent;
  size?: keyof typeof sizes.icon | 14;
  color?: ColorToken;
}) {
  const { colors } = useTheme();
  const px = size === 14 ? 14 : sizes.icon[size];
  return <Glyph size={px} color={colors[color]} strokeWidth={2} />;
}
