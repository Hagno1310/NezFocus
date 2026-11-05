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
  size?: keyof typeof sizes.icon;
  color?: ColorToken;
}) {
  const { colors } = useTheme();
  return (
    <Glyph size={sizes.icon[size]} color={colors[color]} strokeWidth={2} />
  );
}
