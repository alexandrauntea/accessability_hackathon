// Owner: Alina. Profile, accessibility prefs, contacts, consent, disclosure level, export & confirmed delete.
import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { collection, deleteDoc, getDocs } from 'firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import { AppButton, AppText, Card, ChipGroup, Screen, TextField } from '@/src/shared/ui';
import { useProfile } from '@/src/shared/hooks/useProfile';
import { useFeedback } from '@/src/shared/hooks/useFeedback';
import { useTheme } from '@/src/shared/theme/ThemeProvider';
import { db, auth } from '@/src/shared/firebase';
import { METRICS } from '@/src/shared/metrics';
import type { Condition, DisclosureLevel, MetricKey } from '@/src/shared/types';
import { useAuth } from '@/src/shared/hooks/useAuth';

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'endometriosis', label: 'Endometriosis' },
  { value: 'fibromyalgia', label: 'Fibromyalgia' },
  { value: 'chronic_migraine', label: 'Chronic migraine' },
  { value: 'lupus', label: 'Lupus' },
  { value: 'hashimoto', label: 'Hashimoto' },
  { value: 'rheumatoid_arthritis', label: 'Rheumatoid arthritis' },
  { value: 'long_covid', label: 'Long COVID' },
  { value: 'me_cfs', label: 'ME/CFS' },
  { value: 'multiple_sclerosis', label: 'Multiple sclerosis' },
  { value: 'adhd', label: 'ADHD' },
  { value: 'autism', label: 'Autism' },
  { value: 'dyslexia', label: 'Dyslexia' },
  { value: 'anxiety', label: 'Anxiety' },
  { value: 'depression', label: 'Depression' },
  { value: 'burnout', label: 'Burnout' },
];

const SUBCOLS = ['checkins', 'summaries', 'dayPlans', 'requests'];

export default function SettingsScreen() {
  const { profile, updateProfile, update, loading } = useProfile();
  const { logout } = useAuth();
  const { confirm: confirmFeedback } = useFeedback();
  const { c } = useTheme();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyExport, setBusyExport] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (loading || !profile) {
    return (
      <Screen title="Me" speakText="Loading settings.">
        <AppText>Loading profile…</AppText>
      </Screen>
    );
  }

  const a = profile.a11y;
  const toggleA11y = (k: keyof typeof a) => {
    update({ a11y: { ...a, [k]: !a[k] } as any });
  };

  async function exportData() {
    setBusyExport(true);
    setStatusMessage(null);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const out: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        profile,
      };

      for (const colName of SUBCOLS) {
        const snap = await getDocs(collection(db, 'users', uid, colName));
        out[colName] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      const jsonStr = JSON.stringify(out, null, 2);

      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([jsonStr], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `vibecheck-data-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        setStatusMessage('Your data was downloaded as a JSON file.');
      } else {
        await Clipboard.setStringAsync(jsonStr);
        setStatusMessage('Your data was copied to the clipboard as JSON.');
      }
      await confirmFeedback();
    } catch (err: any) {
      setStatusMessage('Export failed: ' + (err?.message || 'unknown error'));
    } finally {
      setBusyExport(false);
    }
  }

  async function executeDelete() {
    setBusyDelete(true);
    setStatusMessage(null);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      for (const colName of SUBCOLS) {
        const snap = await getDocs(collection(db, 'users', uid, colName));
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }

      await update({ conditions: [] });
      await confirmFeedback();
      setStatusMessage('All health check-ins, summaries, plans, and requests have been permanently deleted.');
      setConfirmDelete(false);
    } catch (err: any) {
      setStatusMessage('Deletion failed: ' + (err?.message || 'unknown error'));
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <Screen
      title="Me"
      speakText="Me screen: accessibility preferences, check-in scales, workplace contacts, privacy consent, and data export or deletion."
    >
      {statusMessage && (
        <Card style={{ borderColor: c.primary, borderWidth: 2 }}>
          <AppText accessibilityRole="alert" style={{ fontWeight: '700' }}>
            {statusMessage}
          </AppText>
        </Card>
      )}

      {/* 1. Accessibility Preferences */}
      <Card>
        <AppText variant="h2">Accessibility preferences</AppText>
        <AppText variant="muted">Changes apply immediately across all screens.</AppText>

        <ChipGroup
          label="Text size"
          selected={[String(a.fontScale)]}
          options={[
            { value: '1', label: '100% (Normal)' },
            { value: '1.25', label: '125% (Large)' },
            { value: '1.5', label: '150% (Extra large)' },
          ]}
          onToggle={(v) => update({ a11y: { ...a, fontScale: Number(v) as 1 | 1.25 | 1.5 } })}
        />

        <ChipGroup
          label="Display and reading"
          selected={
            (['lowSensory', 'highContrast', 'dyslexiaFont', 'reduceMotion', 'autoReadAloud', 'simpleLanguage'] as const).filter(
              (k) => a[k]
            )
          }
          options={[
            { value: 'lowSensory', label: 'Low-sensory mode (dark, no motion, square corners)' },
            { value: 'highContrast', label: 'High contrast' },
            { value: 'dyslexiaFont', label: 'Easy-read dyslexia font' },
            { value: 'reduceMotion', label: 'Reduce motion' },
            { value: 'autoReadAloud', label: 'Read screens aloud automatically' },
            { value: 'simpleLanguage', label: 'Simple language' },
          ]}
          onToggle={(k) => toggleA11y(k)}
        />

        <ChipGroup
          label="Confirmation feedback"
          selected={(['haptics', 'sounds'] as const).filter((k) => a[k])}
          options={[
            { value: 'haptics', label: 'Vibration on save (phone)' },
            { value: 'sounds', label: 'Sound on save (uncheck to mute)' },
          ]}
          onToggle={(k) => toggleA11y(k)}
        />
      </Card>

      {/* 2. My Check-in Scales */}
      <Card>
        <AppText variant="h2">My check-in scales (2 or 3)</AppText>
        <AppText variant="muted">
          Tracking fewer scales keeps your daily check-in under 10 seconds.
        </AppText>
        <ChipGroup
          label={`Selected ${profile.trackedMetrics?.length ?? 0} of 3 (minimum 2)`}
          selected={profile.trackedMetrics ?? []}
          options={(Object.keys(METRICS) as MetricKey[]).map((m) => ({
            value: m,
            label: `${METRICS[m].label}: ${METRICS[m].question}`,
          }))}
          onToggle={(m) => {
            const cur = profile.trackedMetrics ?? [];
            const next = cur.includes(m) ? cur.filter((x) => x !== m) : cur.length >= 3 ? cur : [...cur, m];
            if (next.length >= 2 && next.length <= 3) {
              update({ trackedMetrics: next });
            }
          }}
        />
      </Card>

      {/* 3. Workplace Contacts */}
      <Card>
        <AppText variant="h2">Workplace contacts</AppText>
        <AppText variant="muted">Used strictly for accommodation requests you review and send.</AppText>
        <TextField
          label="Preferred first name"
          value={profile.displayName}
          onChangeText={(t) => update({ displayName: t })}
          voice={false}
        />
        <TextField
          label="Job title"
          value={profile.jobTitle ?? ''}
          onChangeText={(t) => update({ jobTitle: t })}
          voice={false}
        />
        <TextField
          label="Manager name"
          value={profile.managerName ?? ''}
          onChangeText={(t) => update({ managerName: t })}
          voice={false}
        />
        <TextField
          label="Manager email"
          value={profile.managerEmail ?? ''}
          onChangeText={(t) => update({ managerEmail: t })}
          voice={false}
          keyboardType="email-address"
        />
        <TextField
          label="HR email"
          value={profile.hrEmail ?? ''}
          onChangeText={(t) => update({ hrEmail: t })}
          voice={false}
          keyboardType="email-address"
        />
      </Card>

      {/* 4. Privacy, Consent & Disclosure */}
      <Card>
        <AppText variant="h2">Privacy, consent & disclosure</AppText>
        <AppText variant="muted">
          You control what is stored and what AI may mention in requests to your employer.
        </AppText>

        <ChipGroup
          label="Consent settings"
          selected={
            (['healthData', 'aiProcessing'] as const).filter((k) => profile.consent[k])
          }
          options={[
            { value: 'healthData', label: 'VibeCheck stores my health check-ins' },
            { value: 'aiProcessing', label: 'AI processes them to adapt my day and draft requests' },
          ]}
          onToggle={(k) =>
            update({
              consent: {
                ...profile.consent,
                [k]: !profile.consent[k],
                acceptedAt: new Date().toISOString(),
              },
            })
          }
        />

        {profile.consent.healthData && (
          <ChipGroup
            label="My conditions (never shared unless you choose Specific disclosure)"
            options={CONDITIONS}
            selected={profile.conditions ?? []}
            onToggle={(c) =>
              update({
                conditions: profile.conditions?.includes(c)
                  ? profile.conditions.filter((x) => x !== c)
                  : [...(profile.conditions ?? []), c],
              })
            }
          />
        )}

        <ChipGroup<DisclosureLevel>
          label="Default disclosure level for accommodation requests"
          selected={[profile.disclosure]}
          options={[
            { value: 'none', label: 'None: only the adjustment needed (no health words)' },
            { value: 'general', label: 'General: mention a health condition (no diagnosis)' },
            { value: 'specific', label: 'Specific: mention my specific condition' },
          ]}
          onToggle={(d) => update({ disclosure: d })}
        />

        <View style={{ gap: 8, marginTop: 8 }}>
          <AppButton
            kind="secondary"
            label="Download my data (JSON)"
            hint="Export all your check-ins, summaries, plans and profile"
            onPress={exportData}
            busy={busyExport}
          />
          <AppButton kind="secondary" label="Sign out" onPress={logout} />

          {!confirmDelete ? (
            <AppButton
              kind="danger"
              label="Delete all my health data"
              hint="Permanently deletes check-ins, summaries, plans and requests"
              onPress={() => setConfirmDelete(true)}
            />
          ) : (
            <Card style={{ borderColor: c.danger, borderWidth: 2, gap: 8 }}>
              <AppText variant="h2" accessibilityRole="alert" style={{ color: c.danger }}>
                Confirm permanent deletion
              </AppText>
              <AppText>
                Are you sure? This will permanently delete all your check-ins, AI summaries, day plans, and requests from Firestore. This action cannot be undone.
              </AppText>
              <View
                style={{
                  flexDirection: a.fontScale > 1 ? 'column' : 'row',
                  gap: 12,
                }}
              >
                <View style={{ flex: a.fontScale > 1 ? undefined : 1 }}>
                  <AppButton
                    kind="secondary"
                    label="Cancel"
                    hint="Keep my data"
                    onPress={() => setConfirmDelete(false)}
                  />
                </View>
                <View style={{ flex: a.fontScale > 1 ? undefined : 1 }}>
                  <AppButton
                    kind="danger"
                    label="Yes, delete everything"
                    hint="Permanently destroy health data"
                    onPress={executeDelete}
                    busy={busyDelete}
                  />
                </View>
              </View>
            </Card>
          )}
        </View>
      </Card>
    </Screen>
  );
}
