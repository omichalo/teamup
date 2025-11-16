import * as nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";

export interface MailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  attachments?: Attachment[];
}

function getEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (typeof v === "undefined" || v === "") {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v;
}

export async function sendMail(options: MailOptions): Promise<void> {
  const host = getEnv("SMTP_HOST");
  const port = Number(getEnv("SMTP_PORT", "587"));
  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASS");
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const fromDefault =
    process.env.SMTP_FROM || `SQY Ping TeamUp <${user}>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  await transporter.verify();

  await transporter.sendMail({
    from: options.from || fromDefault,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
  });
}


