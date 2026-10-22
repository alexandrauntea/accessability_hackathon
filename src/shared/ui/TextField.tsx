import React, { useCallback } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { useTheme } from '../theme/ThemeProvider';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { MIN_TOUCH, space } from '../theme/tokens';

/** Labelled text field with optional dictation (mic) button. */
export function TextField({ label, value, onChangeText, voice = true, ...rest }:
  TextInputProps & { label: string; value: string; onChangeText: (t: string) => void; voice?: boolean }) {
  const { c, font, family, radius } = useTheme();
  const append = useCallback((t: string) => onChangeText(value ? `${value} ${t}` : t), [value, onChangeText]);
  const mic = useVoiceInput(append);
  return (
    <View style={{ gap: space.xs }}>
      <AppText nativeID={`lbl-${label}`}>{label}</AppText>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel={label}
          aria-labelledby={`lbl-${label}`}
          placeholderTextColor={c.textMuted}
          style={{ flex: 1, minHeight: MIN_TOUCH, color: c.text, fontSize: font.body, fontFamily: family, borderWidth: 2, borderColor: c.border, borderRadius: radius.sm, padding: space.sm, backgroundColor: c.surface }}
        />
        {voice && mic.supported ? (
          <AppButton kind="secondary" label={mic.listening ? 'Stop' : 'Dictate'} accessibilityLabel={mic.listening ? 'Stop dictation' : `Dictate ${label}`} onPress={mic.listening ? mic.stop : mic.start} />
        ) : null}
      </View>
    </View>
  );
}
