// Explicit ESM allows top-level await when run through tsx.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const secret = process.env.CRON_SECRET;
if (!secret) throw new Error("Configure CRON_SECRET first.");
const response = await fetch(
  `${process.env.APP_URL || "http://localhost:3000"}/api/cron/reminders`,
  { headers: { Authorization: `Bearer ${secret}` } },
);
if (!response.ok)
  throw new Error(`Reminder endpoint returned ${response.status}`);
console.log(await response.json());
