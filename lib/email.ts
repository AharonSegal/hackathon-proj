/**
 * lib/email.ts
 * -------------
 * SMTP email sender using nodemailer.
 *
 * Supports two TLS modes (auto-detected from port):
 * - Port 465 → secure: true  (TLS from the start)
 * - Port 587 → secure: false (plain + STARTTLS upgrade)
 *
 * For Gmail: enable 2FA, generate an App Password (16 chars),
 * and use that as SMTP_PASSWORD (not your regular account password).
 *
 * Requires environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 */

import nodemailer from 'nodemailer';

export async function sendEmail(
  to: string[],
  subject: string,
  body: string,
): Promise<void> {
  const host     = process.env.SMTP_HOST     ?? 'smtp.gmail.com';
  const port     = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const user     = process.env.SMTP_USER     ?? '';
  const pass     = process.env.SMTP_PASSWORD ?? '';
  const fromName = process.env.EMAIL_FROM_NAME ?? 'Calendar App';

  if (!user || !pass) {
    throw new Error(
      'SMTP credentials not configured — set SMTP_USER and SMTP_PASSWORD',
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for TLS, false for STARTTLS (587)
    auth: { user, pass },
  });

  await transporter.sendMail({
    from:    `"${fromName}" <${user}>`,
    to:      to.join(', '),
    subject,
    text:    body,
  });
}
