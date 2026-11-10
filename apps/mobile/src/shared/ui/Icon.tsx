import { createLucideIcon, type LucideIcon } from 'lucide-react-native';
import { size as sizes, useTheme, type ColorToken } from '../theme';

// DESIGN.md: icons are lucide; spec names (`octagon-x`) map to the PascalCase export (OctagonX).
export type IconComponent = LucideIcon;

// Lucide 1.x rounds the tips of `moon` into bumps; the boards draw the older pointed crescent.
export const Moon = createLucideIcon('moon', [
  ['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z', key: 'moon' }],
]);

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
