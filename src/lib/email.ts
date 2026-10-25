import "server-only";
import { store } from "./config";

type Mail = { to: string; subject: string; html: string };

/**
 * Sends via Resend (https://resend.com) when RESEND_API_KEY is set.
 * Without it, mail is logged so local development keeps working.
 */
export async function sendMail({ to, subject, html }: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? `${store.name} <orders@roopmohana.com>`;
  if (!key) {
    console.info(`[mail] to=${to} subject="${subject}"\n${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) console.error("[mail] send failed", res.status, await res.text());
  } catch (err) {
    console.error("[mail] send failed", err);
  }
}

export function mailLayout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f2ea;font-family:Georgia,serif;color:#1d1a1f">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:22px;letter-spacing:.08em;text-transform:uppercase;color:#7a1f2b;margin-bottom:24px">${store.name}</div>
    <h1 style="font-weight:normal;font-size:24px;margin:0 0 16px">${title}</h1>
    <div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6">${body}</div>
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#6b6470;margin-top:32px">${store.email} · ${store.phone}</p>
  </div></body></html>`;
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
