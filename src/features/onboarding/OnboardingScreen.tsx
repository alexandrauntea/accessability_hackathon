// Owner: Alina. 4-step onboarding flow:
// 1. Choose category (large buttons, not a dropdown)
// 2. Pick 2-3 metrics (from metrics.ts)
// 3. Accessibility preferences (text size 100/125/150, low-sensory, high-contrast, simple language, haptics, sounds)
// 4. Explicit consent to store health data + display name -> save via useProfile -> confirm() -> redirect.
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, AppText, Card, ChipGroup, Screen, TextField } from '@/src/shared/ui';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { useFeedback } from '@/src/shared/hooks/useFeedback';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { CATEGORY_DEFAULTS, METRICS } from '@/src/shared/metrics';
import type { AccessibilityPrefs, MetricKey, UserCategory } from '@/src/shared/types';

export default function OnboardingScreen() {
  const { profile, updateProfile, loading } = useProfile();
  const { confirm } = useFeedback();
  const { c, radius } = useTheme();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.displayName ?? '');
  const [cats, setCats] = useState<UserCategory[]>(profile?.categories ?? []);
  const [metrics, setMetrics] = useState<MetricKey[]>(profile?.trackedMetrics ?? []);
  const [a11y, setA11y] = useState<AccessibilityPrefs>(
    profile?.a11y ?? {
      highContrast: false,
      lowSensory: false,
      fontScale: 1,
      dyslexiaFont: false,
      reduceMotion: false,
      autoReadAloud: false,
      simpleLanguage: false,
      haptics: true,
      sounds: true,
    }
  );
  const [consent, setConsent] = useState<{ healthData: boolean; aiProcessing: boolean }>(
    profile?.consent ?? { healthData: false, aiProcessing: false }
  );
  const [busy, setBusy] = useState(false);

  if (loading || !profile) {
    return (
      <Screen title="Welcome to VibeCheck" speakText="Loading your profile.">
        <AppText>Loading profile�</AppText>
      </Screen>
    );
  }

  const toggleCat = (catKey: UserCategory) => {
    const next = cats.includes(catKey) ? cats.filter((x) => x !== catKey) : [...cats, catKey];
    setCats(next);
    const suggested = Array.from(new Set(next.flatMap((x) => CATEGORY_DEFAULTS[x].metrics))).slice(0, 3);
    setMetrics(suggested);
  };

  const toggleMetric = (m: MetricKey) => {
    setMetrics((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : prev.length >= 3 ? prev : [...prev, m]));
  };

  const updateA11yPref = (patch: Partial<AccessibilityPrefs>) => {
    const next = { ...a11y, ...patch };
    setA11y(next);
    updateProfile({ a11y: next }).catch(() => {});
  };

  async function finish() {
    setBusy(true);
    try {
      await updateProfile({
        displayName: name.trim() || 'Colleague',
        categories: cats,
        trackedMetrics: metrics,
        a11y,
        consent: {
          healthData: consent.healthData,
          aiProcessing: consent.aiProcessing,
          acceptedAt: new Date().toISOString(),
        },
        onboarded: true,
      });
      await confirm();
      router.replace('/');
    } finally {
      setBusy(false);
    }
  }

  const speakTexts = [
    'Step 1 of 4: Choose what affects your work days. Select one or more categories using the large buttons.',
    `Step 2 of 4: Choose two or three metrics to track each day. Currently selected: ${metrics.length} of 3.`,
    'Step 3 of 4: Accessibility preferences. Set your text size, high contrast or low-sensory mode, simple language, and confirmation feedback.',
    'Step 4 of 4: Consent and name. Confirm data storage and AI processing. Nothing reaches your employer without your review.',
  ];

  return (
    <Screen title="Welcome to VibeCheck" speakText={speakTexts[step]}>
      {step === 0 && (
        <Card>
          <AppText variant="h2">Step 1 of 4: What affects your work?</AppText>
          <AppText variant="muted">
            Choose any categories that apply. We ask only your category, never a diagnosis or medical details.
          </AppText>

          <View style={{ gap: 12, marginVertical: 8 }}>
            {(Object.keys(CATEGORY_DEFAULTS) as UserCategory[]).map((catKey) => {
              const def = CATEGORY_DEFAULTS[catKey];
              const isSelected = cats.includes(catKey);
              return (
                <Pressable
                  key={catKey}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${def.label}, ${isSelected ? 'selected' : 'not selected'}`}
                  accessibilityHint={def.aiRole}
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => toggleCat(catKey)}
                  onKeyDown={(e: any) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault?.();
                      toggleCat(catKey);
                    }
                  }}
                  style={({ focused }: any) => ({
                    cursor: 'pointer',
                    outlineStyle: focused ? 'solid' : undefined,
                    outlineWidth: focused ? 3 : 0,
                    outlineColor: c.focus,
                    outlineOffset: 2,
                    borderRadius: radius.md,
                  })}
                >
                  <Card
                    style={{
                      borderWidth: 2,
                      borderColor: isSelected ? c.primary : c.border,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <AppText variant="h2" style={{ color: isSelected ? c.primary : c.text, flex: 1 }}>
                        {isSelected ? '✓ ' : ''}{def.label}
                      </AppText>
                      <View
                        style={{
                          minHeight: 36,
                          minWidth: 84,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: radius.sm,
                          backgroundColor: isSelected ? c.primary : 'transparent',
                          borderWidth: 1,
                          borderColor: isSelected ? c.primary : c.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AppText style={{ color: isSelected ? c.onPrimary : c.text, fontWeight: '700' }}>
                          {isSelected ? 'Selected' : 'Select'}
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="muted">{def.aiRole}</AppText>
                  </Card>
                </Pressable>
              );
            })}
          </View>

          <AppButton
            label="Continue to metrics"
            hint="Proceed to step 2"
            onPress={() => setStep(1)}
            disabled={cats.length === 0}
          />
        </Card>
      )}

      {step === 1 && (
        <Card>
          <AppText variant="h2">Step 2 of 4: What to track</AppText>
          <AppText variant="muted">
            Choose 2 or 3 metrics. Tracking fewer scales keeps your daily check-in under 10 seconds. You can always change this later in Me.
          </AppText>

          <ChipGroup
            label={`Selected ${metrics.length} of 3 (minimum 2)`}
            selected={metrics}
            options={(Object.keys(METRICS) as MetricKey[]).map((m) => ({
              value: m,
              label: `${METRICS[m].label}: ${METRICS[m].question}`,
            }))}
            onToggle={toggleMetric}
          />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <AppButton
                kind="secondary"
                label="Back"
                hint="Return to categories"
                onPress={() => setStep(0)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                label="Continue to preferences"
                hint="Proceed to step 3"
                onPress={() => setStep(2)}
                disabled={metrics.length < 2 || metrics.length > 3}
              />
            </View>
          </View>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <AppText variant="h2">Step 3 of 4: Accessibility preferences</AppText>
          <AppText variant="muted">
            Customise how VibeCheck looks and interacts. These settings apply immediately.
          </AppText>

          <ChipGroup
            label="Text size"
            selected={[String(a11y.fontScale)]}
            options={[
              { value: '1', label: '100% (Normal)' },
              { value: '1.25', label: '125% (Large)' },
              { value: '1.5', label: '150% (Extra large)' },
            ]}
            onToggle={(val) => updateA11yPref({ fontScale: Number(val) as 1 | 1.25 | 1.5 })}
          />

          <ChipGroup
            label="Display and reading"
            selected={
              (['lowSensory', 'highContrast', 'dyslexiaFont', 'reduceMotion', 'autoReadAloud', 'simpleLanguage'] as const).filter(
                (k) => a11y[k]
              )
            }
            options={[
              { value: 'lowSensory', label: 'Low-sensory mode (neutral dark, no motion, square corners)' },
              { value: 'highContrast', label: 'High contrast' },
              { value: 'dyslexiaFont', label: 'Easy-read dyslexia font' },
              { value: 'reduceMotion', label: 'Reduce motion and animations' },
              { value: 'autoReadAloud', label: 'Read screens aloud automatically' },
              { value: 'simpleLanguage', label: 'Simple language (clear, easy-to-read text)' },
            ]}
            onToggle={(k) => updateA11yPref({ [k]: !a11y[k] })}
          />

          <ChipGroup
            label="Confirmation feedback"
            selected={(['haptics', 'sounds'] as const).filter((k) => a11y[k])}
            options={[
              { value: 'haptics', label: 'Vibration on save (phone)' },
              { value: 'sounds', label: 'Sound on save (uncheck to mute)' },
            ]}
            onToggle={(k) => updateA11yPref({ [k]: !a11y[k] })}
          />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <AppButton
                kind="secondary"
                label="Back"
                hint="Return to metrics"
                onPress={() => setStep(1)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                label="Continue to consent"
                hint="Proceed to step 4"
                onPress={() => setStep(3)}
              />
            </View>
          </View>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <AppText variant="h2">Step 4 of 4: Your privacy & consent</AppText>
          <TextField
            label="Preferred first name"
            value={name}
            onChangeText={setName}
            voice={false}
            placeholder="e.g. Elena"
          />

          <AppText>
            VibeCheck stores your check-ins in your private space. AI uses them only to plan your day and draft messages you approve. Nothing reaches your employer unless you review and send it.
          </AppText>

          <ChipGroup
            label="Explicit consent"
            selected={
              (['healthData', 'aiProcessing'] as const).filter((k) => consent[k])
            }
            options={[
              { value: 'healthData', label: 'I agree that VibeCheck stores my check-ins' },
              { value: 'aiProcessing', label: 'I agree that AI processes them to help adapt my work' },
            ]}
            onToggle={(k) => setConsent((prev) => ({ ...prev, [k]: !prev[k] }))}
          />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <AppButton
                kind="secondary"
                label="Back"
                hint="Return to accessibility preferences"
                onPress={() => setStep(2)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                label="Complete onboarding"
                hint="Save your profile and enter VibeCheck"
                onPress={finish}
                disabled={!consent.healthData || !consent.aiProcessing}
                busy={busy}
              />
            </View>
          </View>
        </Card>
      )}
    </Screen>
  );
}
