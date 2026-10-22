// Owner: Andreea. Contrast checked: normal >= 4.5:1 (AA), highContrast >= 7:1 (AAA).
export interface Palette {
  bg: string; surface: string; text: string; textMuted: string; primary: string; onPrimary: string;
  border: string; focus: string; good: string; warn: string; danger: string; aiTint: string;
}

export const palettes: Record<'light' | 'dark' | 'highContrast' | 'lowSensory', Palette> = {
  light: {
    bg: '#FAFAF7', surface: '#FFFFFF', text: '#1A1A1A', textMuted: '#4A4A4A',
    primary: '#2B4FB8', onPrimary: '#FFFFFF', border: '#8A8A8A', focus: '#B35C00',
    good: '#1E6B34', warn: '#8A5300', danger: '#B3261E', aiTint: '#EEF1FB',
  },
  dark: {
    bg: '#121212', surface: '#1E1E1E', text: '#F2F2F2', textMuted: '#C4C4C4',
    primary: '#9DB4FF', onPrimary: '#0B1533', border: '#8F8F8F', focus: '#FFB870',
    good: '#7FD99A', warn: '#FFC266', danger: '#FF8A80', aiTint: '#1D2440',
  },
  highContrast: {
    bg: '#000000', surface: '#000000', text: '#FFFFFF', textMuted: '#FFFFFF',
    primary: '#FFFF00', onPrimary: '#000000', border: '#FFFFFF', focus: '#00FFFF',
    good: '#00FF66', warn: '#FFD000', danger: '#FF6B6B', aiTint: '#000000',
  },
  // Low-sensory / neutral mode: aggressive dark, no saturated alert colours (no bright red for pain),
  // contrast still >= 7:1 for text. Used with square corners and no animation.
  lowSensory: {
    bg: '#0B0B0B', surface: '#111111', text: '#D9D9D9', textMuted: '#B0B0B0',
    primary: '#C8CDD3', onPrimary: '#0B0B0B', border: '#6E6E6E', focus: '#E0E0E0',
    good: '#C8CDD3', warn: '#C8CDD3', danger: '#C8CDD3', aiTint: '#111111',
  },
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12 };
export const MIN_TOUCH = 48; // WCAG 2.5.5 target size
export const baseFont = { body: 18, small: 16, title: 26, h2: 21 }; // never below 16
