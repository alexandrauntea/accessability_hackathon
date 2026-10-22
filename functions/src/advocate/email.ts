// Owner: Alina. Email adapter: mock (outbox collection) -> smtp (nodemailer, e.g. Gmail app password).
// Any error in SMTP mode MUST fall back to mock mode so the demo never crashes.
import nodemailer from 'nodemailer';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export interface Mail {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  replyTo?: string;
}

export interface SendMailResult {
  mode: 'mock' | 'smtp';
  messageId: string;
  fallbackReason?: string;
}

export async function sendMail(
  uid: string,
  mail: Mail,
  creds?: { user?: string; pass?: string }
): Promise<SendMailResult> {
  const outbox = getFirestore().collection(`users/${uid}/outbox`);
  const requestedMode = process.env.EMAIL_MODE === 'smtp' ? 'smtp' : 'mock';

  if (requestedMode === 'smtp' && creds?.user && creds?.pass && process.env.SMTP_HOST) {
    try {
      const port = Number(process.env.SMTP_PORT ?? 465);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
          user: creds.user,
          pass: creds.pass,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
      });

      const info = await transporter.sendMail({
        from: creds.user,
        to: mail.to,
        cc: mail.cc,
        subject: mail.subject,
        text: mail.text,
        replyTo: mail.replyTo,
      });

      await outbox.add({
        ...mail,
        mode: 'smtp',
        messageId: info.messageId,
        at: new Date().toISOString(),
      });

      return { mode: 'smtp', messageId: info.messageId };
    } catch (err: any) {
      // Never log user content or health data; log only integration error
      logger.warn('SMTP delivery failed; falling back to mock outbox', {
        error: err?.message || String(err),
      });
    }
  }

  // Mock mode: write directly to users/{uid}/outbox
  const now = new Date().toISOString();
  const docRef = await outbox.add({
    ...mail,
    mode: 'mock',
    at: now,
  });

  return {
    mode: 'mock',
    messageId: docRef.id,
    ...(requestedMode === 'smtp' ? { fallbackReason: 'SMTP unavailable or failed' } : {}),
  };
}