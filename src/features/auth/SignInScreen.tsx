// Owner: Alexandra. Accessible sign-in: labelled fields, Enter submits, errors announced.
import React, { useState } from 'react';
import { router } from 'expo-router';
import { AppButton, AppText, Card, Screen, TextField } from '@/src/shared/ui';
import { useAuth } from '@/src/shared/hooks/useAuth';

export default function SignInScreen() {
  const { signIn, signInGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(guest = false) {
    setBusy(true); setError(null);
    try { guest ? await signInGuest() : await signIn(email, password); router.replace('/'); }
    catch { setError('Sign-in failed. Check the email and password and try again.'); }
    finally { setBusy(false); }
  }

  return (
    <Screen title="Sign in to VibeCheck" speakText="Sign in with your email and password.">
      <Card>
        <TextField label="Email" value={email} onChangeText={setEmail} voice={false}
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <TextField label="Password" value={password} onChangeText={setPassword} voice={false}
          secureTextEntry autoComplete="password" onSubmitEditing={() => submit()} />
        {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
        <AppButton label="Sign in" onPress={() => submit()} busy={busy} disabled={!email || !password} />
        <AppButton kind="secondary" label="Try it as a guest" hint="No account; data stays only on this device" onPress={() => submit(true)} />
      </Card>
    </Screen>
  );
}