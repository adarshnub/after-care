import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type {
  CareRecord,
  Credentials,
  DischargeInput,
  Viewer,
} from "@/lib/types";
import { dateInZone, tasksOnDate } from "@/lib/schedule";
import { database } from "./config";
import { demoStore, hashPassword } from "./demo-store";
import { HttpError } from "./http";
import { loadEvents } from "./events";

export function hasAccess(user: Viewer, record: CareRecord) {
  return user.role === "nurse"
    ? record.nurseId === user.id
    : user.role === "patient"
      ? record.patientUserId === user.id
      : record.caregiverUserId === user.id;
}
export async function listRecords(user: Viewer): Promise<CareRecord[]> {
  if (user.demo)
    return demoStore((s) => s.records.filter((r) => hasAccess(user, r)));
  const db = database();
  const column =
    user.role === "nurse"
      ? "nurse_id"
      : user.role === "patient"
        ? "patient_user_id"
        : "caregiver_user_id";
  const data = [];
  for (let offset = 0; ; offset += 200) {
    const result = await db
      .from("care_records")
      .select("*")
      .eq(column, user.id)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 199);
    if (result.error) throw new Error("Record query failed");
    data.push(...(result.data || []));
    if ((result.data?.length || 0) < 200) break;
  }
  if (!data.length) return [];
  const completions: Awaited<ReturnType<typeof loadEvents>>["completions"] = [],
    refills: Awaited<ReturnType<typeof loadEvents>>["refills"] = [];
  for (let i = 0; i < data.length; i += 100) {
    const events = await loadEvents(data.slice(i, i + 100).map((r) => r.id));
    completions.push(...events.completions);
    refills.push(...events.refills);
  }
  return data.map((r) => ({
    ...r.document,
    id: r.id,
    nurseId: r.nurse_id,
    patientUserId: r.patient_user_id,
    caregiverUserId: r.caregiver_user_id || undefined,
    createdAt: r.created_at,
    completions: completions
      .filter((e) => e.recordId === r.id)
      .map((e) => e.value),
    refills: refills.filter((e) => e.recordId === r.id).map((e) => e.value),
  }));
}
export async function accessibleRecord(user: Viewer, id: string) {
  const record = (await listRecords(user)).find((r) => r.id === id);
  if (!record) throw new HttpError(404, "Care plan not found.");
  return record;
}
export async function createRecord(user: Viewer, input: DischargeInput) {
  if (user.role !== "nurse")
    throw new HttpError(403, "Only hospital staff can create a discharge.");
  const { reviewed: _reviewed, ...document } = input;
  const id = randomUUID(),
    credentials: Credentials[] = [
      {
        email: input.email.toLowerCase(),
        password: `Ac-${randomBytes(15).toString("base64url")}!`,
        role: "patient",
      },
    ];
  if (input.caregiverEmail)
    credentials.push({
      email: input.caregiverEmail.toLowerCase(),
      password: `Ac-${randomBytes(15).toString("base64url")}!`,
      role: "caregiver",
    });
  if (user.demo) {
    return demoStore((s) => {
      if (
        credentials.some((c) =>
          s.users.some((u) => u.email.toLowerCase() === c.email),
        )
      )
        throw new HttpError(
          409,
          "An account already uses this email. Use a different address.",
        );
      const patientUserId = randomUUID(),
        caregiverUserId = credentials.length > 1 ? randomUUID() : undefined;
      const record: CareRecord = {
        ...document,
        id,
        nurseId: user.id,
        patientUserId,
        caregiverUserId,
        createdAt: new Date().toISOString(),
        completions: [],
      };
      s.records.unshift(record);
      credentials.forEach((c) =>
        s.users.push({
          id: c.role === "patient" ? patientUserId : caregiverUserId!,
          name: c.role === "patient" ? input.name : input.caregiverName,
          email: c.email,
          role: c.role,
          demo: true,
          passwordHash: hashPassword(c.password),
        }),
      );
      return { record, credentials };
    });
  }
  const db = database(),
    ids: string[] = [];
  try {
    for (const credential of credentials) {
      const { data, error } = await db.auth.admin.createUser({
        email: credential.email,
        password: credential.password,
        email_confirm: true,
      });
      if (error || !data.user)
        throw new HttpError(
          409,
          "Couldn’t create credentials. Check that both email addresses are available.",
        );
      ids.push(data.user.id);
    }
    const { error } = await db.from("care_records").insert({
      id,
      nurse_id: user.id,
      patient_user_id: ids[0],
      caregiver_user_id: ids[1] || null,
      document,
    });
    if (error) throw new Error("Discharge save failed");
    return {
      record: {
        ...document,
        id,
        nurseId: user.id,
        patientUserId: ids[0],
        caregiverUserId: ids[1],
        createdAt: new Date().toISOString(),
        completions: [],
      } as CareRecord,
      credentials,
    };
  } catch (error) {
    // Compensate Auth accounts if the record insert or second account creation fails.
    for (const userId of ids) await db.auth.admin.deleteUser(userId);
    throw error;
  }
}
export async function completeTask(
  user: Viewer,
  recordId: string,
  taskId: string,
  date: string,
) {
  const record = await accessibleRecord(user, recordId);
  if (user.role === "nurse")
    throw new HttpError(
      403,
      "Check-offs are recorded by the patient or caregiver.",
    );
  if (
    date !== dateInZone(new Date(), record.timezone) ||
    !tasksOnDate(record, date).some((t) => t.id === taskId)
  )
    throw new HttpError(
      400,
      "Only tasks in today’s care plan can be marked complete.",
    );
  const completion = {
    taskId,
    date,
    completedAt: new Date().toISOString(),
    completedBy: user.id,
  };
  if (user.demo)
    await demoStore((s) => {
      const target = s.records.find((r) => r.id === recordId)!;
      if (
        !target.completions.some((c) => c.taskId === taskId && c.date === date)
      )
        target.completions.push(completion);
    });
  else {
    const { error } = await database().from("care_completions").upsert(
      {
        record_id: recordId,
        task_id: taskId,
        occurrence_date: date,
        completed_at: completion.completedAt,
        user_id: user.id,
      },
      {
        onConflict: "record_id,task_id,occurrence_date",
        ignoreDuplicates: true,
      },
    );
    if (error) throw new Error("Check-off failed");
  }
  return accessibleRecord(user, recordId);
}

export async function addRefill(
  user: Viewer,
  recordId: string,
  medicationId: string,
  quantity: number,
  requestId: string,
) {
  const record = await accessibleRecord(user, recordId);
  if (user.role === "nurse")
    throw new HttpError(
      403,
      "The patient or caregiver records medication received at home.",
    );
  if (!record.plan.medications.some((m) => m.id === medicationId))
    throw new HttpError(404, "Medication not found.");
  if (user.demo)
    await demoStore((s) => {
      const target = s.records.find((r) => r.id === recordId)!;
      target.refills ||= [];
      if (!target.refills.some((r) => r.id === requestId))
        target.refills.push({
          id: requestId,
          medicationId,
          quantity,
          addedAt: new Date().toISOString(),
          addedBy: user.id,
        });
    });
  else {
    const { error } = await database().from("care_refills").upsert(
      {
        id: requestId,
        record_id: recordId,
        medication_id: medicationId,
        quantity,
        user_id: user.id,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error) throw new Error("Refill save failed");
  }
  return accessibleRecord(user, recordId);
}
