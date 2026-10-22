// Owner: Alexandra. Google OAuth on Expo web (implicit flow -> access token).
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { config } from '@/src/shared/config';
import { setGoogleToken } from '@/src/integrations/calendar';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleCalendarAuth(onConnected: () => void) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: config.googleWebClientId,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      setGoogleToken(response.authentication.accessToken);
      onConnected();
    }
  }, [response]);
  return { ready: !!request && !!config.googleWebClientId, connect: () => promptAsync() };
}
