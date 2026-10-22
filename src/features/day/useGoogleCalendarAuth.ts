// Owner: Alexandra. Google OAuth on Expo web (implicit flow -> access token).
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { config } from '@/src/shared/config';
import { setGoogleToken, hasGoogleToken } from '@/src/integrations/calendar';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleCalendarAuth(onConnected?: () => void) {
  const [isConnected, setIsConnected] = useState(hasGoogleToken());

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: config.googleWebClientId,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      setGoogleToken(response.authentication.accessToken);
      setIsConnected(true);
      onConnected?.();
    }
  }, [response]);

  function disconnect() {
    setGoogleToken(null);
    setIsConnected(false);
    onConnected?.();
  }

  const isWeb = Platform.OS === 'web';
  const hasClientId = !!config.googleWebClientId;
  const ready = isWeb && hasClientId && !!request;

  return {
    ready,
    isWeb,
    hasClientId,
    isConnected,
    connect: () => promptAsync(),
    disconnect,
  };
}
