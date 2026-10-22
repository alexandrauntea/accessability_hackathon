// Owner: Alexandra (foundation). Anonymous auth for the demo; data stays tied to the uid.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { auth } from '../firebase';

const Ctx = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, async (u) => {
    if (!u) { await signInAnonymously(auth); return; }
    setUser(u); setLoading(false);
  }), []);
  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
