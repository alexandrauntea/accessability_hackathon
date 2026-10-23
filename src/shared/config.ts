// Feature flags from .env. Each integration flips independently from mock to real.
const flag = (v: string | undefined, def = true) => (v === undefined ? def : v === 'true');

let runtimeForcedAiMode: 'live' | 'fallback' | null = null;

export function setForcedAiMode(mode: 'live' | 'fallback' | null) {
  runtimeForcedAiMode = mode;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (mode) {
        window.localStorage.setItem('VIBECHECK_AI_MODE', mode);
      } else {
        window.localStorage.removeItem('VIBECHECK_AI_MODE');
      }
    }
  } catch {
    // non-blocking
  }
}

export function getEffectiveAiMode(): 'live' | 'fallback' {
  if (runtimeForcedAiMode) return runtimeForcedAiMode;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('VIBECHECK_AI_MODE');
      if (stored === 'fallback' || stored === 'live') return stored;
    }
  } catch {
    // non-blocking
  }
  return (process.env.EXPO_PUBLIC_AI_MODE ?? 'live') === 'fallback' ? 'fallback' : 'live';
}

export const config = {
  mockCalendar: flag(process.env.EXPO_PUBLIC_MOCK_CALENDAR),
  mockTasks: flag(process.env.EXPO_PUBLIC_MOCK_TASKS),
  mockEmail: flag(process.env.EXPO_PUBLIC_MOCK_EMAIL), // informational; server decides via its own env
  useEmulators: flag(process.env.EXPO_PUBLIC_USE_EMULATORS, false),
  functionsRegion: process.env.EXPO_PUBLIC_FUNCTIONS_REGION ?? 'europe-west1',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  get aiMode() {
    return getEffectiveAiMode();
  },
};
