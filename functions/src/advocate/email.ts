// Owner: Alina. Email adapter: mock (outbox collection) -> smtp (nodemailer, e.g. Gmail app password).
import nodemailer from 'nodemailer';
import { getFirestore } from 'firebase-admin/firestore';

export interface Mail { to: string[]; cc?: string[]; subject: string; text: string; replyTo?: string }

export async function sendMail(uid: string, mail: Mail, creds: { user: string; pass: string }) {
  const mode = process.env.EMAIL_MODE === 'smtp' ? 'smtp' : 'mock';
  const outbox = getFirestore().collection(`users/${uid}/outbox`);
  if (mode === 'mock') {
    const doc = await outbox.add({ ...mail, mode, at: new Date().toISOString() });
    return { mode, messageId: doc.id } as const;
  }
  const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 465), secure: true, auth: creds });
  const info = await t.sendMail({ from: creds.user, ...mail });
  await outbox.add({ ...mail, mode, messageId: info.messageId, at: new Date().toISOString() });
  return { mode, messageId: info.messageId } as const;
}
