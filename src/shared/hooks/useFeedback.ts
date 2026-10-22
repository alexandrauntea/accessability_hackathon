// Owner: Andreea. Non-visual confirmation: short vibration (mobile) + discreet sound.
// Both respect the user's prefs (haptics / sounds = mute for sensory sensitivity).
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';
import { useTheme } from '../theme/ThemeProvider';

let player: ReturnType<typeof createAudioPlayer> | null = null;

export function useFeedback() {
  const { a11y } = useTheme();
  return {
    confirm: async () => {
      if (a11y.haptics && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      if (a11y.sounds) {
        try {
          player ??= createAudioPlayer(require('../../../assets/sounds/confirm.wav'));
          player.volume = 0.4;
          player.seekTo(0);
          player.play();
        } catch { /* sound is a bonus, never block */ }
      }
    },
  };
}
