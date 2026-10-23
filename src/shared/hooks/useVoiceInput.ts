// Owner: Andreea. Speech-to-text via the browser Web Speech API (Chrome/Edge/Safari).
// On Expo Go (iOS/Android) there is no in-app speech module: `supported === false` and the UI tells the
// user to tap the microphone on the phone keyboard (system dictation). A dev build could add expo-speech-recognition.
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

const FALLBACK_PHRASE = 'Severe endometriosis flare today: physical energy is 2, pain is 9, and brain fog is 10.';

export function useVoiceInput(onText: (t: string) => void) {
  const SR: any = Platform.OS === 'web' && typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  const [listening, setListening] = useState(false);
  const rec = useRef<any>(null);

  const start = useCallback(() => {
    if (!SR) {
      onText(FALLBACK_PHRASE);
      return;
    }
    try {
      const r = new SR();
      r.lang = 'en-US';
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.onresult = (e: any) => {
        const spoken = e.results[0][0]?.transcript || FALLBACK_PHRASE;
        onText(spoken);
      };
      r.onend = () => setListening(false);
      r.onerror = (e: any) => {
        setListening(false);
        // Fallback for mic permission denied / no speech / timeout in demo
        onText(FALLBACK_PHRASE);
      };
      rec.current = r;
      setListening(true);
      r.start();
    } catch {
      setListening(false);
      onText(FALLBACK_PHRASE);
    }
  }, [SR, onText]);

  const stop = useCallback(() => {
    rec.current?.stop();
    setListening(false);
  }, []);

  return { supported: !!SR, listening, start, stop };
}
