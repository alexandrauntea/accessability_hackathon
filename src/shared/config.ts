// Feature flags from .env. Each integration flips independently from mock to real.
const flag = (v: string | undefined, def = true) => (v === undefined ? def : v === 'true');

export const config = {
  mockCalendar: flag(process.env.EXPO_PUBLIC_MOCK_CALENDAR),
  mockTasks: flag(process.env.EXPO_PUBLIC_MOCK_TASKS),
  mockEmail: flag(process.env.EXPO_PUBLIC_MOCK_EMAIL), // informational; server decides via its own env
  useEmulators: flag(process.env.EXPO_PUBLIC_USE_EMULATORS, false),
  functionsRegion: process.env.EXPO_PUBLIC_FUNCTIONS_REGION ?? 'europe-west1',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
};
