// Owner: Andreea. In-app accessible tutorial modal & screen with X button, Enter key close, and Tab/Enter guide.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, AppText, Card, Screen, SpeakButton } from '@/src/shared/ui';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { MIN_TOUCH, space } from '@/src/shared/theme/tokens';
import { TUTORIAL_STEPS } from './tutorialSteps';

export function TutorialModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c, radius, font, motion } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const headingRef = useRef<any>(null);

  const total = TUTORIAL_STEPS.length;
  const current = TUTORIAL_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  const speakText = `Step ${current.step} of ${total}: ${current.title}. ${current.sentences.join(' ')}${current.tip ? ` ${current.tip}` : ''}`;

  useEffect(() => {
    if (visible && headingRef.current && Platform.OS === 'web') {
      headingRef.current.focus?.();
    }
    if (visible) {
      AccessibilityInfo.announceForAccessibility(`Step ${current.step} of ${total}: ${current.title}`);
    }
  }, [stepIndex, visible, current.step, current.title, total]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && visible) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onClose]);

  const goNext = () => {
    if (!isLast) setStepIndex((prev) => prev + 1);
  };

  const goBack = () => {
    if (!isFirst) setStepIndex((prev) => prev - 1);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={motion ? 'fade' : 'none'}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: space.md,
        }}
      >
        <View
          accessibilityRole="dialog"
          aria-modal={true}
          accessibilityLabel={`Tutorial pop-up, Step ${current.step} of ${total}: ${current.title}`}
          style={{
            width: '100%',
            maxWidth: 580,
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 2,
            borderRadius: radius.md,
            padding: space.lg,
            gap: space.md,
          }}
        >
          {/* Header Row: Step count, Heading, and Close 'X' Button */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm }}>
            <View style={{ flex: 1, gap: space.xs }}>
              <AppText variant="muted" style={{ fontWeight: '700' }}>
                Step {current.step} of {total}
              </AppText>
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
            </View>

            {/* Accessible 'X' button that closes on press, Space, or Enter */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close tutorial (X)"
              accessibilityHint="Closes this instructions pop-up"
              onPress={onClose}
              onKeyDown={(e: any) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault?.();
                  onClose();
                }
              }}
              style={(s: any) => ({
                width: MIN_TOUCH,
                height: MIN_TOUCH,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.sm,
                borderWidth: 2,
                borderColor: c.border,
                backgroundColor: 'transparent',
                cursor: 'pointer',
                outlineStyle: s.focused ? 'solid' : undefined,
                outlineWidth: s.focused ? 3 : 0,
                outlineColor: c.focus,
                outlineOffset: 2,
              } as any)}
            >
              <AppText style={{ fontSize: 20, fontWeight: '700', lineHeight: 22 }}>✕</AppText>
            </Pressable>
          </View>

          {/* Sentences */}
          <View style={{ gap: space.sm }}>
            {current.sentences.map((s, idx) => (
              <AppText key={idx}>{s}</AppText>
            ))}
          </View>

          {/* Tip Box on final step */}
          {current.tip ? (
            <Card
              style={{
                backgroundColor: c.bg,
                borderColor: c.border,
                borderWidth: 1,
                borderLeftWidth: 4,
                borderLeftColor: c.primary,
                borderRadius: radius.sm,
                gap: space.xs,
              }}
            >
              <AppText variant="h2" style={{ fontSize: font.body }}>
                Accessibility tip
              </AppText>
              <AppText>{current.tip}</AppText>
            </Card>
          ) : null}

          {/* Read aloud helper button */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SpeakButton text={speakText} label="Read step aloud" />
          </View>

          {/* Navigation Action Buttons (Back / Next / Finish / Close) */}
          <View style={{ flexDirection: 'row', gap: space.sm, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginTop: space.xs }}>
            <View style={{ flexDirection: 'row', gap: space.sm, flex: 1, minWidth: 200 }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  kind="secondary"
                  label="Back"
                  hint={isFirst ? 'At start of tutorial' : 'Go back to previous step'}
                  disabled={isFirst}
                  onPress={goBack}
                />
              </View>

              <View style={{ flex: 1 }}>
                {isLast ? (
                  <AppButton
                    label="Finish"
                    hint="Complete tutorial and close (Enter)"
                    onPress={onClose}
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

            <AppButton
              kind="secondary"
              label="Close (Enter)"
              hint="Close this pop-up with Enter"
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function TutorialScreen() {
  const [modalVisible, setModalVisible] = useState(true);

  const handleClose = () => {
    setModalVisible(false);
    router.replace('/');
  };

  return (
    <Screen title="How VibeCheck works" speakText="Interactive 1-minute tutorial explaining daily check-ins, capacity scores, keyboard navigation, and privacy.">
      <Card style={{ gap: space.md }}>
        <AppText variant="h2">Tutorial Guide</AppText>
        <AppText>
          The tutorial pop-up opens automatically. If you closed it, tap the button below to reopen the instructions.
        </AppText>
        <AppButton label="Open tutorial pop-up" onPress={() => setModalVisible(true)} />
        <AppButton kind="secondary" label="Return to Today" onPress={handleClose} />
      </Card>
      <TutorialModal visible={modalVisible} onClose={handleClose} />
    </Screen>
  );
}
