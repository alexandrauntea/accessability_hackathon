// Owner: Andreea & Alexandra. Demo tools: reset Ioana Popescu demo state & toggle AI mode.
import React, { useState } from 'react';
import { View } from 'react-native';
import { AppButton, AppText, Card } from '@/src/shared/ui';
import { useAuth } from '@/src/shared/hooks/useAuth';
import { setForcedAiMode, getEffectiveAiMode } from '@/src/shared/config';

export function DemoPersonaPicker({ onSeeded }: { onSeeded?: () => void }) {
  const { user, isDemoUser, resetDemoData } = useAuth();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<'live' | 'fallback'>(getEffectiveAiMode());

  // Only show demo tools for demo accounts or when demo tools flag is active
  if (!isDemoUser && process.env.EXPO_PUBLIC_DEMO_TOOLS !== 'true') {
    return null;
  }

  async function handleReset() {
    setBusy(true);
    setFeedback(null);
    try {
      const count = await resetDemoData();
      setFeedback(`Reset Ioana Popescu demo account: seeded ${count} check-ins, tasks, calendar, and prior request.`);
      onSeeded?.();
    } catch {
      setFeedback('Failed to reset demo data. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function toggleAiMode() {
    const next = aiMode === 'live' ? 'fallback' : 'live';
    setForcedAiMode(next);
    setAiMode(next);
    setFeedback(`AI Mode set to: ${next.toUpperCase()}`);
  }

  return (
    <Card>
      <AppText variant="h2">Demo tools (Ioana Popescu)</AppText>
      <AppText variant="muted">
        Controls for AccessABILITY demo. Resets 6-week flare history, backlog tasks, calendar, and tests AI fallbacks.
      </AppText>

      {feedback ? (
        <AppText style={{ fontWeight: '700' }} accessibilityLiveRegion="polite">
          {feedback}
        </AppText>
      ) : null}

      <View style={{ gap: 8, marginTop: 4 }}>
        <AppButton
          kind="secondary"
          busy={busy}
          label="Reset demo data (Ioana Popescu)"
          hint="Restores fresh Day 1 flare state with 6-week history"
          onPress={handleReset}
        />

        <AppButton
          kind="secondary"
          label={`AI Mode: ${aiMode.toUpperCase()} (Tap to toggle)`}
          hint={aiMode === 'live' ? 'Switch to deterministic offline AI fallback mode' : 'Switch to live Gemini AI mode'}
          onPress={toggleAiMode}
        />
      </View>
    </Card>
  );
}
