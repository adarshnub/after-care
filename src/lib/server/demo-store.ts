import "server-only";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { createDemoRecord } from "@/lib/demo";
import type { CareRecord, Role, Viewer } from "@/lib/types";
import { demoEnabled } from "./config";
import { HttpError } from "./http";

type User = Viewer & { email: string; passwordHash: string };
type DemoState = {
  records: CareRecord[];
  users: User[];
  sessions: Record<string, { userId: string; expires: number }>;
};
const directory = path.join(process.cwd(), ".data"),
  filename = path.join(directory, "demo.json");
let queue: Promise<unknown> = Promise.resolve();
export function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function matchesPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const actual = scryptSync(password, salt, 64),
    expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const demoUserId = (role: Role) => `demo-${role}`;
export async function demoStore<T>(
  fn: (state: DemoState) => T | Promise<T>,
): Promise<T> {
  if (!demoEnabled())
    throw new HttpError(
      503,
      "Add the Supabase configuration to use After Care.",
    );
  const work = queue.then(async () => {
    let state: DemoState;
    let original = "";
    try {
      original = await readFile(filename, "utf8");
      state = JSON.parse(original);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      state = {
        records: [createDemoRecord()],
        sessions: {},
        users: [
          {
            id: "demo-patient",
            name: "Alex Morgan",
            role: "patient",
            demo: true,
            email: "alex@aftercare.demo",
            passwordHash: hashPassword("Aftercare-demo-2026"),
          },
          {
            id: "demo-caregiver",
            name: "Jamie Morgan",
            role: "caregiver",
            demo: true,
            email: "jamie@aftercare.demo",
            passwordHash: hashPassword("Aftercare-demo-2026"),
          },
          {
            id: "demo-nurse",
            name: "Emily Wilson",
            role: "nurse",
            demo: true,
            email: "emily@aftercare.demo",
            passwordHash: hashPassword("Aftercare-demo-2026"),
          },
        ],
      };
    }
    for (const [k, session] of Object.entries(state.sessions))
      if (session.expires < Date.now()) delete state.sessions[k];
    const result = await fn(state);
    const serialized = JSON.stringify(state);
    if (serialized !== original) {
      await mkdir(directory, { recursive: true });
      const temp = `${filename}.${randomBytes(6).toString("hex")}.tmp`;
      await writeFile(temp, serialized, { mode: 0o600 });
      await rename(temp, filename);
    }
    return result;
  });
  queue = work.catch(() => undefined);
  return work;
}
