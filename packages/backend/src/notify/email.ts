// The email side of external notifications. SMTP_URL, SMTP_FROM and ALERT_EMAIL_TO live in the
// environment; without them the channel is disabled rather than failing delivery.
import nodemailer from "nodemailer";

export type EmailOutcome = "sent" | "disabled" | "failed";

export async function sendEmail(subject: string, text: string): Promise<EmailOutcome> {
  const url = process.env.SMTP_URL;
  const to = process.env.ALERT_EMAIL_TO;
  if (!url || !to) return "disabled";
  try {
    const transport = nodemailer.createTransport(url);
    await transport.sendMail({ from: process.env.SMTP_FROM ?? to, to, subject, text });
    return "sent";
  } catch {
    return "failed";
  }
}
