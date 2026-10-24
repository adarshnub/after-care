import "server-only";
import { database } from "./config";
import type { Completion, Refill } from "@/lib/types";

export async function loadEvents(recordIds: string[]) {
  const db = database();
  const completions: { recordId: string; value: Completion }[] = [];
  const refills: { recordId: string; value: Refill }[] = [];
  // Read in bounded pages so completed courses cannot be truncated by PostgREST's row cap.
  for (let offset = 0; ; offset += 500) {
    const rows = await db
      .from("care_completions")
      .select("*")
      .in("record_id", recordIds)
      .order("record_id")
      .order("task_id")
      .order("occurrence_date")
      .range(offset, offset + 499);
    if (rows.error) throw new Error("Completion query failed");
    completions.push(
      ...(rows.data || []).map((e) => ({
        recordId: e.record_id,
        value: {
          taskId: e.task_id,
          date: e.occurrence_date,
          completedAt: e.completed_at,
          completedBy: e.user_id,
        },
      })),
    );
    if ((rows.data?.length || 0) < 500) break;
  }
  for (let offset = 0; ; offset += 500) {
    const rows = await db
      .from("care_refills")
      .select("*")
      .in("record_id", recordIds)
      .order("id")
      .range(offset, offset + 499);
    if (rows.error) throw new Error("Refill query failed");
    refills.push(
      ...(rows.data || []).map((r) => ({
        recordId: r.record_id,
        value: {
          id: r.id,
          medicationId: r.medication_id,
          quantity: r.quantity,
          addedAt: r.added_at,
          addedBy: r.user_id,
        },
      })),
    );
    if ((rows.data?.length || 0) < 500) break;
  }
  return { completions, refills };
}
