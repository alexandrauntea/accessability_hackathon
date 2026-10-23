// Owner: Andreea. Contrast checked: normal >= 4.5:1 (AA), highContrast >= 7:1 (AAA).
export interface Palette {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  border: string;
  focus: string;
  good: string;
  warn: string;
  danger: string;
  aiTint: string;

  // Design tokens from visual redesign
  accent: string;
  accentSoft: string;
  onAccentSoft: string;
  successSoft: string;
  successText: string;
  warningSoft: string;
  warningText: string;
  errorSoft: string;
  errorText: string;
}

export const palettes: Record<'light' | 'dark' | 'highContrast' | 'lowSensory', Palette> = {
  light: {
    bg: '#F7F6FB',
    surface: '#FFFFFF',
    text: '#1F1A2E',
    textMuted: '#4A4560',
    primary: '#5B3FC4',
    onPrimary: '#FFFFFF',
    border: '#E4E1EE',
    focus: '#5B3FC4',
    good: '#1E6B3A',
    warn: '#7A4A00',
    danger: '#A12222',
    aiTint: '#ECE8FA',

    accent: '#5B3FC4',
    accentSoft: '#ECE8FA',
    onAccentSoft: '#4527A0',
    successSoft: '#E3F4EA',
    successText: '#1E6B3A',
    warningSoft: '#FDF0DC',
    warningText: '#7A4A00',
    errorSoft: '#FCE8E8',
    errorText: '#A12222',
  },
  dark: {
    bg: '#14121F',
    surface: '#1E1B2E',
    text: '#F5F4FA',
    textMuted: '#B8B4C8',
    primary: '#9B82F3',
    onPrimary: '#14121F',
    border: '#35304B',
    focus: '#C4B5FD',
    good: '#34D399',
    warn: '#FBBF24',
    danger: '#F87171',
    aiTint: '#2A2445',

    accent: '#9B82F3',
    accentSoft: '#2A2445',
    onAccentSoft: '#DDD6FE',
    successSoft: '#064E3B',
    successText: '#6EE7B7',
    warningSoft: '#78350F',
    warningText: '#FDE68A',
    errorSoft: '#7F1D1D',
    errorText: '#FCA5A5',
  },
  highContrast: {
    bg: '#000000',
    surface: '#000000',
    text: '#FFFFFF',
    textMuted: '#FFFFFF',
    primary: '#FFFF00',
    onPrimary: '#000000',
    border: '#FFFFFF',
    focus: '#00FFFF',
    good: '#00FF66',
    warn: '#FFD000',
    danger: '#FF6B6B',
    aiTint: '#000000',

    accent: '#FFFF00',
    accentSoft: '#000000',
    onAccentSoft: '#FFFF00',
    successSoft: '#000000',
    successText: '#00FF66',
    warningSoft: '#000000',
    warningText: '#FFD000',
    errorSoft: '#000000',
    errorText: '#FF6B6B',
  },
  lowSensory: {
    bg: '#0B0B0B',
    surface: '#111111',
    text: '#D9D9D9',
    textMuted: '#B0B0B0',
    primary: '#C8CDD3',
    onPrimary: '#0B0B0B',
    border: '#888888',
    focus: '#E0E0E0',
    good: '#C8CDD3',
    warn: '#C8CDD3',
    danger: '#C8CDD3',
    aiTint: '#111111',

    accent: '#C8CDD3',
    accentSoft: '#1A1A1A',
    onAccentSoft: '#D9D9D9',
    successSoft: '#1A1A1A',
    successText: '#C8CDD3',
    warningSoft: '#1A1A1A',
    warningText: '#C8CDD3',
    errorSoft: '#1A1A1A',
    errorText: '#C8CDD3',
  },
};

// Spacing scale: strictly 4, 8, 12, 16, 24, 32, 48
export const space = {
  xs: 4,
  sm: 8,
  md12: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  cardGap: 16,
  cardInnerGap: 12,
  cardPadding: 24,
  screenPadding: 24,
  screenPaddingNarrow: 16,
  sectionSpacing: 32,
};

// Radius scale: card 20, button/chip 12, pill 999
export const radius = {
  sm: 8,
  md: 12,
  card: 20,
  pill: 999,
};

export const MIN_TOUCH = 48; // WCAG 2.5.5 target size
export const baseFont = { body: 18, small: 16, title: 26, h2: 21 }; // never below 16