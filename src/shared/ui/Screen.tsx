import React, { createContext, useContext, useEffect } from 'react';
import { ScrollView, StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { layout, space } from '../theme/tokens';
import { AppText } from './AppText';
import { SpeakButton } from './SpeakButton';
import { useSpeech } from '../hooks/useSpeech';
import { ErrorBoundary } from './ErrorBoundary';

export const CardGridContext = createContext<boolean>(false);
export function useCardGrid() { return useContext(CardGridContext); }

export function CardGrid({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { width } = useWindowDimensions();
  const isGrid = width >= layout.breakpoints.grid;
  return (
    <CardGridContext.Provider value={isGrid}>
      <View style={[{ width: '100%', flexDirection: isGrid ? 'row' : 'column', flexWrap: isGrid ? 'wrap' : 'nowrap', gap: space.cardGap, alignItems: 'stretch' }, style]}>
        {children}
      </View>
    </CardGridContext.Provider>
  );
}

/**
 * Every screen uses this: single centred content column (max width 600px on web, full width on phone),
 * centred screen title + optional subtitle, TTS read-aloud button (+ auto-read when enabled).
 */
export function Screen({
  title,
  subtitle,
  speakText,
  children,
  grid = false,
}: {
  title: string;
  subtitle?: string;
  speakText?: string;
  children: React.ReactNode;
  grid?: boolean;
}) {
  const { c, a11y } = useTheme();
  const { width } = useWindowDimensions();
  const { speak } = useSpeech();

  useEffect(() => {
    if (a11y.autoReadAloud && speakText) speak(speakText);
  }, [a11y.autoReadAloud, speakText]);

  const isDesktop = width >= layout.breakpoints.desktop;
  const isTablet = width >= layout.breakpoints.tablet && width < layout.breakpoints.desktop;
  const isNarrowPhone = width < 480;

  const contentMaxWidth = isDesktop ? layout.maxWidth.desktop : isTablet ? layout.maxWidth.tablet : '100%';
  const hPadding = isDesktop ? layout.padding.desktop : isTablet ? layout.padding.tablet : isNarrowPhone ? layout.padding.phoneNarrow : layout.padding.phone;
  const isGrid = grid && width >= layout.breakpoints.grid;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPadding,
          paddingVertical: space.lg,
          gap: space.cardGap,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View style={{ alignItems: 'center', gap: space.xs, marginBottom: space.xs, position: 'relative' }}>
          <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <AppText
              variant="title"
              style={{
                textAlign: 'center',
                fontWeight: '700',
              }}
            >
              {title}
            </AppText>
            {subtitle ? (
              <AppText
                variant="muted"
                style={{
                  textAlign: 'center',
                  marginTop: space.xs,
                  maxWidth: layout.maxWidth.reading,
                }}
              >
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {speakText ? (
            <View style={{ position: 'absolute', right: 0, top: 0 }}>
              <SpeakButton text={speakText} />
            </View>
          ) : null}
        </View>
        <ErrorBoundary>
          <CardGridContext.Provider value={isGrid}>
            {isGrid ? (
              <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: space.cardGap, alignItems: 'stretch' }}>
                {children}
              </View>
            ) : (
              children
            )}
          </CardGridContext.Provider>
        </ErrorBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}
