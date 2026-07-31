import nodemailer, { Transporter } from 'nodemailer';
import { env } from '@/config/env';
import { HttpError } from '@/utils/http-error';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass || !env.smtp.from) {
    throw HttpError.badRequest('Email delivery is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_FROM missing)');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}) {
  const client = getTransporter();
  await client.sendMail({ from: env.smtp.from, to: input.to, subject: input.subject, html: input.html, attachments: input.attachments });
}
