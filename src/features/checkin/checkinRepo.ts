// Owner: Andreea. All Firestore access for check-ins lives here.
// Other slices may IMPORT getTodayCheckin / listCheckins (read-only contract).
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { db, auth } from '@/src/shared/firebase';
import { todayISO } from '@/src/shared/dates';
import { deriveCapacity } from '@/src/shared/metrics';
import type { Checkin } from '@/src/shared/types';

const col = (uid = auth.currentUser?.uid) => {
  if (!uid) throw new Error('User is not authenticated');
  return collection(db, 'users', uid, 'checkins');
};

export type CheckinInput = Omit<Checkin, 'capacity' | 'capacityScore' | 'createdAt' | 'date'> & { date?: string };

export async function saveCheckin(input: CheckinInput): Promise<Checkin> {
  const date = input.date ?? todayISO();
  const { capacityScore, capacity } = deriveCapacity(input.metrics);
  const checkin: Checkin = {
    ...input,
    date,
    capacityScore,
    capacity,
    createdAt: new Date().toISOString(),
  };
  // Firestore rejects undefined fields
  Object.keys(checkin).forEach((k) => (checkin as any)[k] === undefined && delete (checkin as any)[k]);
  await setDoc(doc(col(), date), checkin);
  return checkin;
}

export async function getTodayCheckin(): Promise<Checkin | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(doc(col(uid), todayISO()));
  return snap.exists() ? (snap.data() as Checkin) : null;
}

export async function listCheckins(n = 60): Promise<Checkin[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const snap = await getDocs(query(col(uid), orderBy('date', 'desc'), limit(n)));
  return snap.docs.map((d) => d.data() as Checkin);
}