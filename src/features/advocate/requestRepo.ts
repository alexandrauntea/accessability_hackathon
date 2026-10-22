// Owner: Alina.
import { addDoc, collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { db, auth } from '@/src/shared/firebase';
import type { AccommodationRequest, RequestCategory, RequestDraft } from '@/src/shared/types';

const col = () => collection(db, 'users', auth.currentUser!.uid, 'requests');

export async function createRequest(category: RequestCategory) {
  const r = await addDoc(col(), { category, status: 'clarifying', messages: [], createdAt: new Date().toISOString() });
  return r.id;
}
export const watchRequest = (id: string, cb: (r: AccommodationRequest) => void) =>
  onSnapshot(doc(col(), id), (s) => s.exists() && cb({ id: s.id, ...(s.data() as any) }));
export const watchRequests = (cb: (rs: AccommodationRequest[]) => void) =>
  onSnapshot(query(col(), orderBy('createdAt', 'desc')), (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
export const saveDraftEdits = (id: string, draft: RequestDraft) => setDoc(doc(col(), id), { draft }, { merge: true });
