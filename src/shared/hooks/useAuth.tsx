// Owner: Alexandra. Email/password accounts (primary demo: Ioana Popescu) + guest (anonymous).
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { isDemoEmail, seedIoanaDemoData, DEMO_SEED_VERSION } from '@/src/mocks/demoUser';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  isDemoUser: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInGuest: () => Promise<void>;
  logout: () => Promise<void>;
  resetDemoData: () => Promise<number>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check and apply idempotent demo seed on login for demo accounts
  async function handleDemoSeedCheck(u: User) {
    if (!u.email || !isDemoEmail(u.email)) return;
    try {
      const snap = await getDoc(doc(db, 'users', u.uid));
      const seedVersion = snap.exists() ? (snap.data()?.seedVersion ?? 0) : 0;
      if (seedVersion < DEMO_SEED_VERSION) {
        console.log(`[Demo] Idempotently seeding Ioana Popescu demo data for ${u.email}`);
        await seedIoanaDemoData(u.uid);
      }
    } catch (err) {
      console.warn('[Demo] Seed check error:', err);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        await handleDemoSeedCheck(u);
      }
    });
    return () => unsub();
  }, []);

  const value: AuthCtx = {
    user,
    loading,
    isDemoUser: isDemoEmail(user?.email),
    signIn: async (email, password) => {
      const cleanEmail = email.trim();
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        await handleDemoSeedCheck(cred.user);
      } catch (err: any) {
        // If demo email doesn't exist yet in Firebase Auth, auto-create it
        if (
          isDemoEmail(cleanEmail) &&
          (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential')
        ) {
          console.log(`[Demo] Auto-registering demo account for ${cleanEmail}`);
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          await seedIoanaDemoData(cred.user.uid, true);
          return;
        }
        throw err;
      }
    },
    signUp: async (email, password) => {
      const cleanEmail = email.trim();
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      if (isDemoEmail(cleanEmail)) {
        await seedIoanaDemoData(cred.user.uid, true);
      }
    },
    signInGuest: async () => {
      await signInAnonymously(auth);
    },
    logout: () => signOut(auth),
    resetDemoData: async () => {
      if (!user) throw new Error('Not authenticated');
      return await seedIoanaDemoData(user.uid, true);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
