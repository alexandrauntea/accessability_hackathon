// Owner: Andreea. Reads a11y prefs from the profile and exposes colours + font sizes.
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { baseFont, palettes, Palette, radius as baseRadius, space as baseSpace } from './tokens';
import type { AccessibilityPrefs } from '../types';

export const defaultA11y: AccessibilityPrefs = {
  highContrast: false, lowSensory: false, fontScale: 1, dyslexiaFont: false, reduceMotion: false,
  autoReadAloud: false, simpleLanguage: false, haptics: true, sounds: true,
};

interface Theme {
  c: Palette;
  font: typeof baseFont;
  family?: string;
  a11y: AccessibilityPrefs;
  radius: typeof baseRadius;
  space: typeof baseSpace;
  motion: boolean;
}
const Ctx = createContext<Theme | null>(null);

export function ThemeProvider({ prefs, children }: { prefs?: AccessibilityPrefs; children: React.ReactNode }) {
  const scheme = useColorScheme();
  const a11y = { ...defaultA11y, ...(prefs ?? {}) };
  const value = useMemo<Theme>(() => {
    const c = a11y.highContrast ? palettes.highContrast : a11y.lowSensory ? palettes.lowSensory : scheme === 'dark' ? palettes.dark : palettes.light;
    const s = a11y.fontScale;
    const font = { body: baseFont.body * s, small: baseFont.small * s, title: baseFont.title * s, h2: baseFont.h2 * s };
    const radius = a11y.lowSensory ? { sm: 0, md: 0, card: 0, pill: 0 } : baseRadius; // brutalist, square
    const motion = !(a11y.reduceMotion || a11y.lowSensory);
    return { c, font, family: a11y.dyslexiaFont ? 'AtkinsonHyperlegible_400Regular' : undefined, a11y, radius, space: baseSpace, motion };
  }, [JSON.stringify(a11y), scheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => {
  const t = useContext(Ctx);
  if (!t) throw new Error('useTheme outside ThemeProvider');
  return t;
};