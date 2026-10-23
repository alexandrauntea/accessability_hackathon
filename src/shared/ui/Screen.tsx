import React, { useEffect } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { AppText } from './AppText';
import { SpeakButton } from './SpeakButton';
import { useSpeech } from '../hooks/useSpeech';

/**
 * Every screen uses this: single centred content column (max width 600px on web, full width on phone),
 * centred screen title + optional subtitle, TTS read-aloud button (+ auto-read when enabled).
 */
export function Screen({
  title,
  subtitle,
  speakText,
  children,
}: {
  title: string;
  subtitle?: string;
  speakText?: string;
  children: React.ReactNode;
}) {
  const { c, a11y } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 480;
  const { speak } = useSpeech();

  useEffect(() => {
    if (a11y.autoReadAloud && speakText) speak(speakText);
  }, [a11y.autoReadAloud, speakText]);

  const hPadding = isNarrow ? space.screenPaddingNarrow : space.screenPadding;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPadding,
          paddingVertical: space.lg,
          gap: space.cardGap,
          maxWidth: 600,
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
                  maxWidth: 480,
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
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}