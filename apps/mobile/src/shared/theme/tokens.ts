// Values copied from DESIGN.md front matter; change DESIGN.md first, then this file.

export const lightColors = {
  bg: '#F6F8FE',
  'surface-1': '#FFFFFF',
  'surface-2': '#EEF2FB',
  'surface-3': '#DCE4F6',
  'text-primary': '#1B2140',
  'text-secondary': '#4B5578',
  'text-tertiary': '#5F6889',
  primary: '#3A64CC',
  'on-primary': '#FFFFFF',
  'primary-inverse': '#6EA6FB',
  border: '#C2CDE8',
  'border-input': '#7C88AE',
  'phase-focus': '#3A64CC',
  'phase-focus-room': '#E6EDFD',
  'phase-short': '#8F5A00',
  'phase-short-room': '#FBF0DA',
  'phase-long': '#A4432A',
  'phase-long-room': '#FBE6DE',
  success: '#1E7A4F',
  warning: '#8A5A00',
  danger: '#C2283A',
  'brand-primary': '#547FE4',
  'brand-navy': '#2B3257',
  'overlay-pressed': '#00000014',
  scrim: '#F6F8FE99',
  shadow: '#2B325724',
};

export type ColorToken = keyof typeof lightColors;
export type Colors = Record<ColorToken, string>;

export const darkColors: Colors = {
  bg: '#11162A',
  'surface-1': '#171D35',
  'surface-2': '#1E2542',
  'surface-3': '#262F52',
  'text-primary': '#E6EAF6',
  'text-secondary': '#A4AECB',
  'text-tertiary': '#8590B2',
  primary: '#6EA6FB',
  'on-primary': '#0E1430',
  'primary-inverse': '#3A64CC',
  border: '#2F3961',
  'border-input': '#646F98',
  'phase-focus': '#6EA6FB',
  'phase-focus-room': '#0F1A36',
  'phase-short': '#F2B45C',
  'phase-short-room': '#211B10',
  'phase-long': '#F08A6C',
  'phase-long-room': '#26150F',
  success: '#4CC38A',
  warning: '#F59A3C',
  danger: '#FF7A7A',
  'brand-primary': '#547FE4',
  'brand-navy': '#2B3257',
  'overlay-pressed': '#00000029',
  scrim: '#11162A99',
  shadow: '#2B325766',
};

// Android family names registered by the expo-font plugin in app.config.ts.
export const fontFamily = {
  text: 'Be Vietnam Pro',
  numeric: 'Unbounded',
  mono: 'JetBrains Mono',
} as const;

type Weight = '400' | '500' | '600' | '700' | '800';
type TypeStyle = {
  fontFamily: string;
  fontWeight: Weight;
  fontSize: number;
  lineHeight: number;
  fontVariant?: 'tabular-nums'[];
};

const text = (fontWeight: Weight, fontSize: number, lineHeight: number) =>
  ({
    fontFamily: fontFamily.text,
    fontWeight,
    fontSize,
    lineHeight,
  }) satisfies TypeStyle;
// DESIGN.md › Typography: Unbounded digits are proportional unless tnum is on.
const numeric = (fontWeight: Weight, fontSize: number, lineHeight: number) =>
  ({
    fontFamily: fontFamily.numeric,
    fontWeight,
    fontSize,
    lineHeight,
    fontVariant: ['tabular-nums'],
  }) satisfies TypeStyle;

export const typography = {
  display: text('800', 34, 44),
  'title-1': text('700', 26, 36),
  'title-2': text('600', 20, 28),
  headline: text('600', 17, 24),
  body: text('400', 16, 24),
  'body-sm': text('400', 14, 20),
  label: text('500', 13, 20),
  tab: text('500', 11, 14),
  timer: numeric('500', 60, 69),
  'timer-long': numeric('500', 48, 56),
  stat: numeric('600', 32, 40),
  'numeric-inline': numeric('500', 13, 20),
  mono: {
    fontFamily: fontFamily.mono,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
  } satisfies TypeStyle,
};

export type TypeVariant = keyof typeof typography;

// C-24 "`stat` nhỏ": board `C-15 · … · FormMessage` › CodeInput draws Unbounded 600 at 26.
export const codeDigit = numeric('600', 26, 32);

export const radius = {
  badge: 4,
  input: 8,
  button: 12,
  server: 16,
  sheet: 24,
  full: 9999,
};

export const space = {
  1: 4,
  2: 8,
  3: 16,
  4: 24,
  5: 32,
  6: 48,
  7: 64,
};

export const motion = {
  micro: 120,
  short: 200,
  medium: 320,
  long: 1200,
};

// Fixed component sizes from DESIGN.md › Components / Layout and docs/design/screens/00-components.md.
export const size = {
  touch: 48,
  buttonL: 48,
  buttonM: 44,
  buttonS: 40,
  field: 48,
  header: 56,
  tabBar: 56,
  banner: 40,
  segment: 36,
  // Gap between the segment track and the selected pill.
  segmentInset: 2,
  tri: { width: 40, height: 32 },
  actionRow: 56,
  groupTitle: 28,
  settingsRow: 56,
  dialogMax: 320,
  handle: { width: 36, height: 4 },
  checkbox: 22,
  codeCell: { width: 48, height: 56, largeHeight: 72 },
  badge: 16,
  badgeDot: 8,
  icon: { xs: 14, sm: 16, base: 18, md: 20, lg: 22, xl: 24 },
  focusRing: 2,
  hairline: 1,
  // Emphasis border: focused / error fields, checkbox frame (C-02, C-23, C-24).
  strokeThick: 2,
  // Boards (TextField help, PasswordRules, Segment/item): icon–text gap 6 in small rows.
  iconGap: 6,
  // C-13 Avatar sizes; DESIGN.md › Presence: dot 10 on 32–40, 14 on 56–96, cut 2.
  avatar: [20, 24, 32, 40, 56, 96] as const,
  presence: { sm: 10, lg: 14, cut: 2 },
  avatarStackOverlap: -6,
};

// Slop that grows a visible height to the 48 touch target (00-components › Vùng chạm).
export const touchSlop = (visible: number) =>
  Math.max(0, (size.touch - visible) / 2);

// DESIGN.md › Typography › Cỡ chữ 200%. `large`: system scale at which layouts switch.
export const fontScale = {
  heading: 1.6,
  narrowLabel: 1.3,
  large: 2,
};

// DESIGN.md › Elevation: only sheets and dialogs cast a shadow.
export const sheetShadow = (colors: Colors) => ({
  boxShadow: `0px -4px 24px ${colors.shadow}`,
});
