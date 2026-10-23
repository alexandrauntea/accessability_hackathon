// Owner: Andreea. In-app accessible tutorial: 6 steps, keyboard/screen-reader friendly.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, AppText, Card, Screen } from '@/src/shared/ui';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { space } from '@/src/shared/theme/tokens';
import { TUTORIAL_STEPS } from './tutorialSteps';

export default function TutorialScreen() {
  const { c, radius, font } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const headingRef = useRef<any>(null);

  const total = TUTORIAL_STEPS.length;
  const current = TUTORIAL_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  const speakText = `Step ${current.step} of ${total}: ${current.title}. ${current.sentences.join(' ')}${current.tip ? ` ${current.tip}` : ''}`;

  useEffect(() => {
    // Focus the step heading on web / native when step changes
    if (headingRef.current) {
      if (Platform.OS === 'web') {
        headingRef.current.focus?.();
      }
    }
    // Screen reader announcement for mobile and web
    AccessibilityInfo.announceForAccessibility(`Step ${current.step} of ${total}: ${current.title}`);
  }, [stepIndex, current.step, current.title, total]);

  const goNext = () => {
    if (!isLast) {
      setStepIndex((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (!isFirst) {
      setStepIndex((prev) => prev - 1);
    }
  };

  const finish = () => {
    router.replace('/');
  };

  return (
    <Screen title="How VibeCheck works" speakText={speakText}>
      {/* Progress indicators / Step badge */}
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Step ${current.step} of ${total}`}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <AppText variant="muted" style={{ fontWeight: '700' }}>
          Step {current.step} of {total}
        </AppText>
        <AppText variant="muted">1 minute tour</AppText>
      </View>

      {/* Main step content card */}
      <Card accessibilityLiveRegion="polite" style={{ gap: space.md }}>
        <AppText
          ref={headingRef}
          variant="h2"
          accessibilityRole="header"
          aria-level={2}
          {...({ tabIndex: -1 } as any)}
          style={{ outlineStyle: 'none' }}
        >
          {current.title}
        </AppText>

        <View style={{ gap: space.sm }}>
          {current.sentences.map((s, idx) => (
            <AppText key={idx}>{s}</AppText>
          ))}
        </View>

        {/* Accessibility tip box on the final step */}
        {current.tip ? (
          <Card
            style={{
              backgroundColor: c.surface,
              borderColor: c.border,
              borderWidth: 1,
              borderLeftWidth: 4,
              borderLeftColor: c.primary,
              borderRadius: radius.sm,
              gap: space.xs,
              marginTop: space.xs,
            }}
          >
            <AppText variant="h2" style={{ fontSize: font.body }}>
              Accessibility tip
            </AppText>
            <AppText>{current.tip}</AppText>
          </Card>
        ) : null}
      </Card>

      {/* Navigation action buttons (>= 48px, accessible, Space/Enter) */}
      <View style={{ gap: space.sm, marginTop: space.xs }}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <AppButton
              kind="secondary"
              label="Back"
              hint={isFirst ? 'At the beginning of the tutorial' : 'Go back to previous step'}
              disabled={isFirst}
              onPress={goBack}
            />
          </View>

          <View style={{ flex: 1 }}>
            {isLast ? (
              <AppButton
                label="Finish"
                hint="Complete tutorial and return to Today"
                onPress={finish}
              />
            ) : (
              <AppButton
                label="Next"
                hint={`Go to step ${current.step + 1} of ${total}`}
                onPress={goNext}
              />
            )}
          </View>
        </View>

        {!isLast ? (
          <AppButton
            kind="secondary"
            label="Skip tour"
            hint="Exit tutorial and go to Today"
            onPress={finish}
          />
        ) : null}
      </View>
    </Screen>
  );
}
