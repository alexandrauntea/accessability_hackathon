import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
export function requireUid(req: CallableRequest<unknown>): string {
  if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in first');
  return req.auth.uid;
}
export const REGION = process.env.REGION ?? 'europe-west1';
