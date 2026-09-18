import nodemailer from 'nodemailer';

// No real email provider is wired up yet (that's a deliberate "figure out in
// production" deferral — see SKILL.md) — without SMTP_HOST configured, mail
// is never actually sent anywhere; it's rendered to a Buffer via
// nodemailer's streamTransport and dumped to the server console instead, so
// invite/reset links are still usable while testing locally. Once a real
// SMTP_HOST/PORT/USER/PASS (or a provider like Resend/SendGrid's SMTP
// bridge) is set in .env, this same call starts actually delivering mail
// with zero code changes elsewhere.
function createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
}

export async function sendMail({ to, subject, html, text, attachments }) {
  const transport = createTransport();
  const from = process.env.SMTP_FROM || 'SchoolApp 360 <no-reply@schoolapp360.local>';
  const info = await transport.sendMail({ from, to, subject, html, text, attachments });

  if (!process.env.SMTP_HOST) {
    // eslint-disable-next-line no-console
    console.log(`\n[dev email — no SMTP_HOST configured, not actually sent]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
  }

  return info;
}
