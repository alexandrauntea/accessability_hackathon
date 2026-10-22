import React from 'react';
import { AppButton } from './AppButton';
import { useSpeech } from '../hooks/useSpeech';

export function SpeakButton({ text, label = 'Read aloud' }: { text: string; label?: string }) {
  const { speak, stop, speaking } = useSpeech();
  return (
    <AppButton kind="secondary" label={speaking ? 'Stop reading' : label}
      hint="Reads this section out loud" onPress={() => (speaking ? stop() : speak(text))} />
  );
}
