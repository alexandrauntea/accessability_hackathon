// Owner: Alina. Live profile from users/{uid}; creates a default one on first run.
import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import { defaultA11y } from '../theme/ThemeProvider';
import type { UserProfile } from '../types';

export const defaultProfile = (uid: string): UserProfile => ({
  uid,
  displayName: '',
  categories: [],
  trackedMetrics: [],
  conditions: [],
  disclosure: 'general',
  workHours: { start: '09:00', end: '17:30' },
  a11y: defaultA11y,
  consent: { healthData: false, aiProcessing: false },
  onboarded: false,
});

export interface UseProfileReturn {
  profile: UserProfile | null;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  update: (patch: Partial<UserProfile>) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

export function useProfile(): UseProfileReturn {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const ref = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setDoc(ref, defaultProfile(user.uid)).catch((err) => {
            setError(err instanceof Error ? err : new Error(String(err)));
          });
          return;
        }
        setProfile(snap.data() as UserProfile);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!user) {
        const err = new Error('Cannot update profile: not signed in');
        setError(err);
        throw err;
      }
      try {
        const ref = doc(db, 'users', user.uid);
        await setDoc(ref, patch, { merge: true });
      } catch (err: any) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        throw errorObj;
      }
    },
    [user]
  );

  return { profile, updateProfile, update: updateProfile, loading, error };
}
