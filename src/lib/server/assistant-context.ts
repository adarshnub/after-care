import type { CareRecord } from "@/lib/types";
import { dateInZone, medicationStock } from "@/lib/schedule";

// Pure projection: send reviewed instructions and current estimates, without
// account identity, credential, refill-author, or completion-author fields.
export function assistantContext(record: CareRecord, now = new Date()) {
  const today = dateInZone(now, record.timezone);
  return {
    today,
    timezone: record.timezone,
    plan: record.plan,
    medicationSupply: record.plan.medications.map((medication) => {
      const stock = medicationStock(record, medication.id, today);
      return {
        medicationId: medication.id,
        name: medication.name,
        estimatedRemainingUnits: stock.remaining,
        estimatedDaysLeft: stock.daysLeft,
      };
    }),
    completions: record.completions.map((completion) => ({
      taskId: completion.taskId,
      date: completion.date,
    })),
  };
}
