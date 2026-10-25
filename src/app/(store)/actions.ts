"use server";

import { z } from "zod";
import { getDb, schema } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail, mailLayout, escapeHtml } from "@/lib/email";

type State = { ok?: string; error?: string } | undefined;

export async function subscribe(_: State, form: FormData): Promise<State> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Enter a valid email." };
  if (!(await rateLimit("subscribe", 10, 60 * 60 * 1000))) return { error: "Please try later." };
  const db = await getDb();
  await db.insert(schema.subscribers).values({ email: email.data }).onConflictDoNothing();
  return { ok: "Thank you — you're on the list." };
}

const enquirySchema = z.object({
  kind: z.enum(["contact", "customization"]),
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional(),
  phone: z.string().trim().max(20).optional(),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(4000),
  budget: z.string().trim().max(60).optional(),
});

export async function submitEnquiry(_: State, form: FormData): Promise<State> {
  if (!(await rateLimit("enquiry", 5, 60 * 60 * 1000))) return { error: "Too many messages. Please try later." };
  const parsed = enquirySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!d.email && !d.phone) return { error: "Leave an email or phone number so we can reply." };
  const db = await getDb();
  await db.insert(schema.enquiries).values({
    kind: d.kind,
    name: d.name,
    email: d.email || null,
    phone: d.phone || null,
    message: d.message,
    budget: d.budget || null,
  });
  const owner = process.env.OWNER_NOTIFY_EMAIL;
  if (owner) {
    await sendMail({
      to: owner,
      subject: `New ${d.kind} enquiry from ${d.name}`,
      html: mailLayout(
        `New ${d.kind} enquiry`,
        `<p><b>${escapeHtml(d.name)}</b> · ${escapeHtml(d.email ?? "")} · ${escapeHtml(d.phone ?? "")}</p><p>${escapeHtml(d.message).replace(/\n/g, "<br/>")}</p>`,
      ),
    });
  }
  return { ok: "Thank you! We'll get back to you within one working day." };
}
