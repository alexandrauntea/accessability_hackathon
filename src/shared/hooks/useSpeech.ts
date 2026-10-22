// Owner: Andreea. Text-to-speech (expo-speech uses Web Speech API on web).
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const speak = useCallback((text: string) => {
    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, { language: 'en-US', rate: 0.95, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  }, []);
  const stop = useCallback(() => { Speech.stop(); setSpeaking(false); }, []);
  useEffect(() => () => { Speech.stop(); }, []);
  return { speak, stop, speaking };
}
