// Owner: Alexandra. Accessible sign-in: labelled fields, Enter submits, errors announced.
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, AppText, Card, Screen, TextField } from '@/src/shared/ui';
import { useAuth } from '@/src/shared/hooks/useAuth';

export default function SignInScreen() {
  const { signIn, signUp, signInGuest } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(mode: 'submit' | 'guest' = 'submit') {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'guest') {
        await signInGuest();
      } else if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      router.replace('/');
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (msg.includes('auth/weak-password')) {
        setError('Password should be at least 6 characters.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Try signing in.');
      } else if (msg.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(isSignUp ? 'Could not create account. Please try again.' : 'Sign-in failed. Check your email and password.');
      }
    } finally {
      setBusy(false);
    }
  }

  function fillDemoIoana() {
    setEmail('ioanapopescu@gmail.com');
    setPassword('Demo2026!');
    setError(null);
  }

  return (
    <Screen
      title={isSignUp ? 'Create a VibeCheck account' : 'Sign in to VibeCheck'}
      speakText={isSignUp ? 'Create a new account with email and password.' : 'Sign in with your email and password, or try as a guest.'}
    >
      <Card>
        {/* Quick Demo Pre-fill for Judges & Testing */}
        <AppButton
          kind="secondary"
          label="Demo: Sign in as Ioana Popescu (Junior Data Analyst)"
          hint="Pre-fills Ioana Popescu demo credentials"
          onPress={fillDemoIoana}
        />

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          voice={false}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          voice={false}
          secureTextEntry
          autoComplete="password"
          onSubmitEditing={() => submit()}
        />

        {error ? (
          <AppText accessibilityRole="alert" style={{ color: '#E53935', fontWeight: '700' }}>
            {error}
          </AppText>
        ) : null}

        <AppButton
          label={isSignUp ? 'Create account' : 'Sign in'}
          hint={isSignUp ? 'Create new VibeCheck account' : 'Sign in to your account'}
          onPress={() => submit('submit')}
          busy={busy}
          disabled={!email || !password}
        />

        <AppButton
          kind="secondary"
          label={isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one'}
          hint="Switch between sign-in and sign-up"
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
        />

        <View style={{ height: 1, backgroundColor: '#E0E0E0', marginVertical: 8 }} aria-hidden={true} />

        <AppButton
          kind="secondary"
          label="Try it as a guest (Anonymous)"
          hint="No account needed; data stays only in this session"
          onPress={() => submit('guest')}
          disabled={busy}
        />
      </Card>
    </Screen>
  );
}
