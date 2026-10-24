// Explicit ESM allows top-level await when run through tsx.
import nextEnv from "@next/env";
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import webpush from "web-push";

if (process.env.VERCEL === "1") throw new Error("Generate keys locally, then add them to Vercel Environment Variables.");
nextEnv.loadEnvConfig(process.cwd());
const file = new URL("../.env.local", import.meta.url);
let contents = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
  if (error.code === "ENOENT") return "";
  throw error;
});
const additions: Record<string, string> = {};
if (Boolean(process.env.VAPID_PUBLIC_KEY) !== Boolean(process.env.VAPID_PRIVATE_KEY)) {
  throw new Error("An incomplete VAPID keypair already exists. Restore the matching pair before running setup.");
}
if (!process.env.VAPID_PUBLIC_KEY) {
  const pair = webpush.generateVAPIDKeys();
  additions.VAPID_PUBLIC_KEY = pair.publicKey;
  additions.VAPID_PRIVATE_KEY = pair.privateKey;
}
if (!process.env.CRON_SECRET) additions.CRON_SECRET = randomBytes(32).toString("base64url");
for (const [key, value] of Object.entries(additions)) {
  const entry = new RegExp(`^${key}\\s*=.*$`, "m");
  if (entry.test(contents)) contents = contents.replace(entry, `${key}=${value}`);
  else contents += `${contents.endsWith("\n") || !contents ? "" : "\n"}${key}=${value}\n`;
}
if (Object.keys(additions).length) {
  await writeFile(file, contents, { mode: 0o600 });
  console.log(`Saved ${Object.keys(additions).join(", ")} privately in .env.local.`);
} else console.log("Existing VAPID keys and CRON_SECRET preserved; no changes needed.");
if (!process.env.VAPID_SUBJECT) console.log("Also set VAPID_SUBJECT to your hospital's mailto: contact or HTTPS URL.");
console.log("Copy these values into Vercel Environment Variables and redeploy. Keep the same VAPID pair for existing subscribers.");
