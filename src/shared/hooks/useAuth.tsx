// Owner: Alexandra. Email/password accounts (3 demo personas) + optional guest (anonymous).
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signInAnonymously, signOut, User } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthCtx {
  user: User | null; loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInGuest: () => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }), []);
  const value: AuthCtx = {
    user, loading,
    signIn: async (email, password) => { await signInWithEmailAndPassword(auth, email.trim(), password); },
    signInGuest: async () => { await signInAnonymously(auth); },
    logout: () => signOut(auth),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);