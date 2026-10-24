import "server-only";
import { createClient } from "@supabase/supabase-js";
import { localDemoEnabled } from "@/lib/deployment";

export const configured = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const demoEnabled = () =>
  localDemoEnabled(process.env);
export const aiConfigured = () => Boolean(process.env.OPENAI_API_KEY);
export const pushConfigured = () =>
  Boolean(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );
export function database() {
  if (!configured()) throw new Error("Supabase is not configured.");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
