// Owner: Alexandra.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/src/shared/firebase';
import type { DayPlan } from '@/src/shared/types';

const ref = (date: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return doc(db, 'users', uid, 'dayPlans', date);
};

export const saveDayPlan = async (p: DayPlan) => {
  if (!auth.currentUser?.uid) return;
  await setDoc(ref(p.date), p);
};

export const getDayPlan = async (date: string) => {
  if (!auth.currentUser?.uid) return null;
  const s = await getDoc(ref(date));
  return s.exists() ? (s.data() as DayPlan) : null;
};