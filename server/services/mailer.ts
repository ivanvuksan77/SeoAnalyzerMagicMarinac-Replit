import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const SMTP_REPLY_TO = process.env.SMTP_REPLY_TO || "info@magicmarinac.hr";

export function isSmtpConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM);
}

function createTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function sendVerificationEmail(params: {
  to: string;
  code: string;
  verificationLink: string;
  lang?: "en" | "hr";
}): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("Email delivery is not configured. Missing SMTP environment variables.");
  }
  const lang = params.lang === "hr" ? "hr" : "en";
  const subject =
    lang === "hr"
      ? "Potvrdite svoju e-mail adresu — SiteSnap"
      : "Verify your email — SiteSnap";

  const text =
    lang === "hr"
      ? [
          `Pozdrav,`,
          ``,
          `Hvala na kupnji pristupnog koda ${params.code}.`,
          `Kliknite na poveznicu ispod kako biste aktivirali pristup i bili vraćeni u aplikaciju:`,
          ``,
          params.verificationLink,
          ``,
          `Klikom na ovu poveznicu vaš će pristupni kôd biti aktiviran i bit ćete automatski vraćeni na SiteSnap gdje možete odmah početi koristiti svoja skeniranja.`,
          ``,
          `Poveznica vrijedi 30 minuta. Ako je niste vi zatražili, slobodno ignorirajte ovu poruku.`,
          ``,
          `— Tim SiteSnap`,
        ].join("\n")
      : [
          `Hi,`,
          ``,
          `Thanks for purchasing access code ${params.code}.`,
          `Click the link below to activate your access and return to the app:`,
          ``,
          params.verificationLink,
          ``,
          `Clicking this link will activate your access code and bring you straight back to SiteSnap where you can start using your scans immediately.`,
          ``,
          `The link expires in 30 minutes. If you didn't request this, you can safely ignore this email.`,
          ``,
          `— The SiteSnap team`,
        ].join("\n");

  const transporter = createTransport();
  await transporter.sendMail({
    from: SMTP_FROM,
    replyTo: SMTP_REPLY_TO,
    to: params.to,
    subject,
    text,
  });
}

export async function sendPdfReportEmail(params: {
  to: string;
  url: string;
  tier: "free" | "basic" | "pro";
  downloadLink: string;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("Email delivery is not configured. Missing SMTP environment variables.");
  }

  const transporter = createTransport();
  await transporter.sendMail({
    from: SMTP_FROM,
    replyTo: SMTP_REPLY_TO,
    to: params.to,
    subject: `Your SEO Report (${params.tier.toUpperCase()})`,
    text: `Your SEO report for ${params.url} is ready.\n\nDownload it here: ${params.downloadLink}\n\nIf you have questions, reply to this email.`,
  });
}
