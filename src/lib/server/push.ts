import "server-only";
import webpush from "web-push";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { database, configured, pushConfigured } from "./config";
import { HttpError } from "./http";
import { dueReminders } from "@/lib/schedule";
import type { CareRecord, Viewer } from "@/lib/types";
import { loadEvents } from "./events";

export const subscriptionSchema = z.object({
  endpoint: z
    .url()
    .max(4000)
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        (!url.port || url.port === "443") &&
        [
          "fcm.googleapis.com",
          "updates.push.services.mozilla.com",
          "web.push.apple.com",
          "notify.windows.com",
        ].some(
          (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
        )
      );
    }, "This push service is not supported."),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .min(20)
      .max(200),
    auth: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .min(10)
      .max(100),
  }),
});
export async function subscribe(
  user: Viewer,
  subscription: z.infer<typeof subscriptionSchema>,
) {
  if (user.demo || !pushConfigured())
    throw new HttpError(
      503,
      "Background notifications need Supabase and Web Push configuration. In-app reminders are available in the demo.",
    );
  const db = database();
  // A browser endpoint is bound to one signed-in account at a time.
  const { error } = await db
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: subscription.endpoint, subscription },
      { onConflict: "endpoint" },
    );
  if (error) throw new Error("Subscription save failed");
}
export async function unsubscribe(user: Viewer, endpoint: string) {
  if (user.demo) return;
  const { error } = await database()
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  if (error) throw new Error("Subscription delete failed");
}
export async function sendReminders(now = new Date()) {
  if (!configured() || !pushConfigured())
    throw new HttpError(503, "Supabase and Web Push must be configured first.");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const db = database();
  let sent = 0,
    failed = 0;
  // Page records so the PostgREST default row cap cannot silently drop patients.
  for (let offset = 0; ; offset += 200) {
    const rows = await db
      .from("care_records")
      .select("*")
      .order("id")
      .range(offset, offset + 199);
    if (rows.error) throw new Error("Reminder records query failed");
    if (!rows.data?.length) break;
    for (const row of rows.data) {
      const events = await loadEvents([row.id]);
      const record: CareRecord = {
        ...row.document,
        id: row.id,
        nurseId: row.nurse_id,
        patientUserId: row.patient_user_id,
        caregiverUserId: row.caregiver_user_id,
        createdAt: row.created_at,
        completions: events.completions.map((e) => e.value),
        refills: events.refills.map((e) => e.value),
      };
      const due = dueReminders(record, now);
      if (!due.length) continue;
      const users = [row.patient_user_id, row.caregiver_user_id].filter(
        Boolean,
      );
      const subs = await db
        .from("push_subscriptions")
        .select("*")
        .in("user_id", users);
      if (subs.error) throw new Error("Subscription query failed");
      for (const reminder of due)
        for (const sub of subs.data || []) {
          const parsed = subscriptionSchema.safeParse(sub.subscription);
          if (!parsed.success) continue;
          const key = `${reminder.key}:${createHash("sha256").update(sub.endpoint).digest("hex")}`,
            token = randomUUID();
          const claim = await db.rpc("claim_reminder", {
            p_key: key,
            p_token: token,
          });
          if (claim.error) throw new Error("Reminder claim failed");
          if (!claim.data) continue;
          try {
            await webpush.sendNotification(
              parsed.data as webpush.PushSubscription,
              JSON.stringify({
                title: reminder.title,
                body: reminder.body,
                tag: reminder.key,
                url: "/workspace",
              }),
              { TTL: 900, timeout: 10000 },
            );
            const ack = await db
              .from("reminder_deliveries")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("delivery_key", key)
              .eq("lease_token", token);
            if (ack.error) throw new Error("Reminder acknowledgment failed");
            sent++;
          } catch (error) {
            failed++;
            if (
              [404, 410].includes(
                (error as { statusCode?: number }).statusCode || 0,
              )
            )
              await db.from("push_subscriptions").delete().eq("id", sub.id);
            await db
              .from("reminder_deliveries")
              .delete()
              .eq("delivery_key", key)
              .eq("lease_token", token)
              .eq("status", "sending");
          }
        }
    }
    if (rows.data.length < 200) break;
  }
  return { sent, failed };
}
