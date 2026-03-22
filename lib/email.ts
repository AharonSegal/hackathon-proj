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
