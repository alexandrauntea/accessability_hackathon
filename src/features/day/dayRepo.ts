// Owner: Alexandra.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/src/shared/firebase';
import type { DayPlan } from '@/src/shared/types';

const ref = (date: string) => doc(db, 'users', auth.currentUser!.uid, 'dayPlans', date);
export const saveDayPlan = (p: DayPlan) => setDoc(ref(p.date), p);
export const getDayPlan = async (date: string) => { const s = await getDoc(ref(date)); return s.exists() ? (s.data() as DayPlan) : null; };
