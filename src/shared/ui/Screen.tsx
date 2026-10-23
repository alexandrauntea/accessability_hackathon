import { ErrorBoundary } from './ErrorBoundary';
import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { space } from '../theme/tokens';
import { AppText } from './AppText';
import { SpeakButton } from './SpeakButton';
import { useSpeech } from '../hooks/useSpeech';

/**
 * Every screen uses this: one h1 title, an optional spoken summary (read-aloud button
 * + auto-read when the user enabled it), max width for readability on web.
 */
export function Screen({ title, speakText, children }: { title: string; speakText?: string; children: React.ReactNode }) {
  const { c, a11y } = useTheme();
  const { speak } = useSpeech();
  useEffect(() => { if (a11y.autoReadAloud && speakText) speak(speakText); }, [a11y.autoReadAloud, speakText]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
          <AppText variant="title" style={{ flex: 1 }}>{title}</AppText>
          {speakText ? <SpeakButton text={speakText} /> : null}
        </View>
        <ErrorBoundary>{children}</ErrorBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}
