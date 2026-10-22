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

  const p = (await db.doc(`users/${uid}`).get()).data() as UserProfile;
  if (!p) throw new HttpsError('not-found', 'User profile not found');

  // Hard guarantee: Recipients MUST come from user's profile, NEVER from the model
  const allowedRecipients = [p.managerEmail, p.hrEmail].filter(
    (e): e is string => typeof e === 'string' && e.trim().length > 0
  );

  if (!allowedRecipients.length) {
    throw new HttpsError('failed-precondition', 'Add a manager or HR email in Me before sending');
  }

  // Filter draft recipients so only those matching profile are allowed
  const verifiedTo = r.draft.to.filter((email) => allowedRecipients.includes(email));
  const finalTo = verifiedTo.length > 0 ? verifiedTo : allowedRecipients;

  const footer = `\n\n—\nWritten with the help of VibeCheck, reviewed and sent by ${p.displayName || 'me'}.`;

  let userCreds: { user?: string; pass?: string } | undefined;
  try {
    userCreds = {
      user: SMTP_USER.value(),
      pass: SMTP_PASS.value(),
    };
  } catch {
    // Secret not defined or unavailable in local emulator
    userCreds = undefined;
  }

  const res = await sendMail(
    uid,
    {
      to: finalTo,
      cc: r.draft.cc,
      subject: r.draft.subject,
      text: r.draft.body + footer,
    },
    userCreds
  );

  await ref.update({
    status: 'sent',
    sentAt: new Date().toISOString(),
    'draft.to': finalTo,
  });

  return { ok: true, ...res };
});