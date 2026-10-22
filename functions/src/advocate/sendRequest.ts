// Owner: Alina. Sends ONLY after explicit user confirmation, the exact text the user reviewed.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import { requireUid, REGION } from '../lib/auth';
import { sendMail } from './email';
import type { AccommodationRequest, UserProfile } from '../lib/types';

const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');

export const sendRequest = onCall({ region: REGION, secrets: [SMTP_USER, SMTP_PASS] }, async (req) => {
  const uid = requireUid(req);
  const { requestId, confirm } = req.data as { requestId: string; confirm: boolean };
  if (confirm !== true) throw new HttpsError('failed-precondition', 'User confirmation required');
  const db = getFirestore();
  const ref = db.doc(`users/${uid}/requests/${requestId}`);
  const r = (await ref.get()).data() as AccommodationRequest | undefined;
  if (!r?.draft) throw new HttpsError('failed-precondition', 'No draft to send');
  if (!r.draft.to.length) throw new HttpsError('failed-precondition', 'Add a manager or HR email in Me');
  const p = (await db.doc(`users/${uid}`).get()).data() as UserProfile;
  const footer = `\n\n—\nWritten with the help of VibeCheck, reviewed and sent by ${p.displayName || 'me'}.`;
  const res = await sendMail(uid, { to: r.draft.to, cc: r.draft.cc, subject: r.draft.subject, text: r.draft.body + footer },
    { user: SMTP_USER.value(), pass: SMTP_PASS.value() });
  await ref.update({ status: 'sent', sentAt: new Date().toISOString() });
  return { ok: true, ...res };
});
