// Owner: Alina. 4-step onboarding flow:
// 1. Choose category (large buttons, not a dropdown)
// 2. Pick 2-3 metrics (from metrics.ts)
// 3. Accessibility preferences (text size 100/125/150, low-sensory, high-contrast, simple language, haptics, sounds)
// 4. Explicit consent to store health data + display name -> save via useProfile -> confirm() -> redirect.
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, AppText, Card, ChipGroup, IconHeader, Screen, TextField } from '@/src/shared/ui';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { useFeedback } from '@/src/shared/hooks/useFeedback';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { CATEGORY_DEFAULTS, METRICS } from '@/src/shared/metrics';
import type { AccessibilityPrefs, MetricKey, UserCategory } from '@/src/shared/types';

export default function OnboardingScreen() {
  const { profile, updateProfile, loading } = useProfile();
  const { confirm } = useFeedback();
  const { c, radius, space } = useTheme();

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
      <Screen title="Welcome to VibeCheck" subtitle="Loading your profile" speakText="Loading your profile.">
        <AppText>Loading profile…</AppText>
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
    <Screen
      title="Welcome to VibeCheck"
      subtitle="Set up your profile and preferences in 4 quick steps"
      speakText={speakTexts[step]}
    >
      {/* Step Progress Pill Indicator */}
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Onboarding progress"
        style={{ flexDirection: 'row', gap: space.xs, marginBottom: space.xs }}
      >
        {['Affects', 'Metrics', 'Preferences', 'Privacy'].map((stepLabel, idx) => {
          const isActive = step === idx;
          const isDone = step > idx;
          return (
            <View
              key={stepLabel}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Step ${idx + 1} of 4: ${stepLabel}${isActive ? ', current' : isDone ? ', completed' : ''}`}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: space.sm,
                borderRadius: radius.pill,
                backgroundColor: isActive ? c.accent : isDone ? c.accentSoft : c.surface,
                borderWidth: 1,
                borderColor: isActive ? c.accent : isDone ? c.border : c.border,
              }}
            >
              <AppText
                variant="small"
                style={{
                  fontWeight: isActive ? '700' : '600',
                  fontSize: 12,
                  color: isActive ? c.onPrimary : isDone ? c.onAccentSoft : c.textMuted,
                }}
              >
                {isDone ? `${stepLabel}` : `${idx + 1}. ${stepLabel}`}
              </AppText>
            </View>
          );
        })}
      </View>

      {step === 0 && (
        <Card>
          <IconHeader
            icon="body-outline"
            title="Step 1 of 4: What affects your work?"
            subtitle="Choose any categories that apply. We ask only your category, never a diagnosis or medical details."
          />

          <View style={{ gap: space.sm, marginVertical: space.sm }}>
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
                    alignSelf: 'stretch',
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
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
                      borderWidth: 1.5,
                      borderColor: isSelected ? c.accent : c.border,
                      backgroundColor: isSelected ? c.accentSoft : c.surface,
                      gap: space.xs,
                      padding: space.md,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
                      <AppText variant="h2" style={{ color: isSelected ? c.onAccentSoft : c.text, flex: 1, fontWeight: '700' }}>
                        {def.label}
                      </AppText>
                      <View
                        style={{
                          minHeight: 36,
                          minWidth: 84,
                          paddingHorizontal: space.sm,
                          paddingVertical: space.xs,
                          borderRadius: radius.pill,
                          backgroundColor: isSelected ? c.accent : 'transparent',
                          borderWidth: 1,
                          borderColor: isSelected ? c.accent : c.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AppText style={{ color: isSelected ? c.onPrimary : c.text, fontWeight: '700', fontSize: 13 }}>
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
          <IconHeader
            icon="options-outline"
            title="Step 2 of 4: What to track"
            subtitle="Choose 2 or 3 metrics. Tracking fewer scales keeps your daily check-in under 10 seconds. You can always change this later in Me."
          />

          <ChipGroup
            label={`Selected ${metrics.length} of 3 (minimum 2)`}
            selected={metrics}
            options={(Object.keys(METRICS) as MetricKey[]).map((m) => ({
              value: m,
              label: `${METRICS[m].label}: ${METRICS[m].question}`,
            }))}
            onToggle={toggleMetric}
          />

          <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm }}>
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
          <IconHeader
            icon="color-palette-outline"
            title="Step 3 of 4: Accessibility preferences"
            subtitle="Customise how VibeCheck looks and interacts. These settings apply immediately."
          />

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

          <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm }}>
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
          <IconHeader
            icon="shield-checkmark-outline"
            title="Step 4 of 4: Consent & your details"
            subtitle="Your data belongs to you. We store health check-ins only to adapt your day and suggest workplace accommodations."
          />

          <TextField
            label="Your preferred name or nickname"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Maria"
            voice={false}
          />

          <ChipGroup
            label="Consent settings (required to proceed)"
            selected={
              (['healthData', 'aiProcessing'] as const).filter((k) => consent[k])
            }
            options={[
              {
                value: 'healthData',
                label: 'I consent to VibeCheck storing my daily check-in scales',
              },
              {
                value: 'aiProcessing',
                label: 'I consent to AI processing my check-ins to adapt my schedule and draft requests',
              },
            ]}
            onToggle={(key) =>
              setConsent((prev) => ({ ...prev, [key]: !prev[key] }))
            }
          />

          <Card style={{ backgroundColor: c.accentSoft, borderColor: c.border }}>
            <AppText variant="small" style={{ color: c.textMuted }}>
              Privacy guarantee: Nothing is sent to your employer or manager without your explicit preview, confirmation, and send action. You can export or permanently delete your data at any time in the Me tab.
            </AppText>
          </Card>

          <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm }}>
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
                label="Finish setup"
                hint="Save your preferences and start using VibeCheck"
                onPress={finish}
                busy={busy}
                disabled={!consent.healthData || !consent.aiProcessing}
              />
            </View>
          </View>
        </Card>
      )}
    </Screen>
  );
}