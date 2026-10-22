// Owner: Alina. Live profile from users/{uid}; creates a default one on first run.
import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import { defaultA11y } from '../theme/ThemeProvider';
import type { UserProfile } from '../types';

export const defaultProfile = (uid: string): UserProfile => ({
  uid, displayName: '', categories: [], trackedMetrics: [], conditions: [], disclosure: 'general',
  workHours: { start: '09:00', end: '17:30' }, a11y: defaultA11y,
  consent: { healthData: false, aiProcessing: false }, onboarded: false,
});

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setDoc(ref, defaultProfile(user.uid)); return; }
      setProfile(snap.data() as UserProfile);
    });
  }, [user]);
  const update = (patch: Partial<UserProfile>) => user && setDoc(doc(db, 'users', user.uid), patch, { merge: true });
  return { profile, update };
}
