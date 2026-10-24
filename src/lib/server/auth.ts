import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { configured, database, demoEnabled } from "./config";
import { demoStore, tokenHash, matchesPassword } from "./demo-store";
import { HttpError } from "./http";
import type { Role, Viewer } from "@/lib/types";

const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
export async function establishDemo(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await demoStore((s) => {
    if (!s.users.some((u) => u.id === userId))
      throw new HttpError(401, "Account not found.");
    s.sessions[tokenHash(token)] = { userId, expires: Date.now() + 86400000 };
  });
  (await cookies()).set("ac-demo", token, { ...options, maxAge: 86400 });
}
export async function login(email: string, password: string) {
  if (configured()) {
    const { data, error } = await database().auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session)
      throw new HttpError(401, "The email or password doesn’t match.");
    const jar = await cookies();
    jar.set("ac-access", data.session.access_token, {
      ...options,
      maxAge: data.session.expires_in,
    });
    jar.set("ac-refresh", data.session.refresh_token, {
      ...options,
      maxAge: 60 * 60 * 24 * 7,
    });
  } else {
    if (!demoEnabled())
      throw new HttpError(503, "The hospital has not configured access yet.");
    const id = await demoStore((s) => {
      const user = s.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );
      const valid = matchesPassword(
        password,
        user?.passwordHash ||
          "00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      );
      if (!user || !valid)
        throw new HttpError(401, "The email or password doesn’t match.");
      return user.id;
    });
    await establishDemo(id);
  }
  return viewer();
}
export async function viewer(): Promise<Viewer> {
  const jar = await cookies();
  if (!configured()) {
    const token = jar.get("ac-demo")?.value;
    if (!token || !demoEnabled())
      throw new HttpError(401, "Sign in to see your care plan.");
    return demoStore((s) => {
      const session = s.sessions[tokenHash(token)];
      const user = session && s.users.find((u) => u.id === session.userId);
      if (!user)
        throw new HttpError(
          401,
          "Your session has expired. Please sign in again.",
        );
      return { id: user.id, name: user.name, role: user.role, demo: true };
    });
  }
  const authClient = database();
  let token = jar.get("ac-access")?.value;
  let result = token ? await authClient.auth.getUser(token) : null;
  if (!result?.data.user && jar.get("ac-refresh")?.value) {
    const refreshed = await authClient.auth.refreshSession({
      refresh_token: jar.get("ac-refresh")!.value,
    });
    if (refreshed.data.session) {
      token = refreshed.data.session.access_token;
      jar.set("ac-access", token, {
        ...options,
        maxAge: refreshed.data.session.expires_in,
      });
      jar.set("ac-refresh", refreshed.data.session.refresh_token, {
        ...options,
        maxAge: 604800,
      });
      result = await authClient.auth.getUser(token);
    }
  }
  const user = result?.data.user;
  if (!user)
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  // Auth refresh populates its client's session. Keep server-authorized table
  // lookups on a fresh service client so the patient JWT cannot replace it.
  const db = database();
  const staff = await db
    .from("staff_members")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (staff.error)
    throw new HttpError(
      503,
      "Hospital access is not ready. Please contact your administrator.",
    );
  if (staff.data)
    return { id: user.id, name: staff.data.name, role: "nurse", demo: false };
  const patient = await db
    .from("care_records")
    .select("patient_user_id,caregiver_user_id,document")
    .or(`patient_user_id.eq.${user.id},caregiver_user_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();
  if (patient.error || !patient.data)
    throw new HttpError(
      403,
      "No care plan is linked to your account. Please contact your hospital.",
    );
  const role: Role =
    patient.data.patient_user_id === user.id ? "patient" : "caregiver";
  return {
    id: user.id,
    name:
      role === "patient"
        ? patient.data.document.name
        : patient.data.document.caregiverName,
    role,
    demo: false,
  };
}
export async function requireNurse() {
  const user = await viewer();
  if (user.role !== "nurse")
    throw new HttpError(403, "Only your hospital care team can do that.");
  return user;
}
export async function logout() {
  const jar = await cookies(),
    token = jar.get("ac-demo")?.value;
  if (token && demoEnabled())
    await demoStore((s) => {
      delete s.sessions[tokenHash(token)];
    });
  if (configured()) {
    const refresh = jar.get("ac-refresh")?.value;
    // Revoke the refresh session through the Auth API before clearing local cookies.
    if (refresh) {
      const db = database();
      const { data } = await db.auth.refreshSession({ refresh_token: refresh });
      if (data.session) await db.auth.signOut({ scope: "local" });
    }
  }
  for (const key of ["ac-demo", "ac-access", "ac-refresh"]) jar.delete(key);
}
