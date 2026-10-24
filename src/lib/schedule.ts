import type { CareRecord, Task } from "./types";

export function dateInZone(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function timeInZone(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}
export function addDays(date: string, count: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}
export function dayNumber(record: CareRecord, date: string): number {
  return Math.max(
    1,
    Math.floor(
      (Date.parse(`${date}T12:00:00Z`) -
        Date.parse(`${record.dischargeDate}T12:00:00Z`)) /
        86400000,
    ) + 1,
  );
}
export function tasksOnDate(record: CareRecord, date: string): Task[] {
  return record.plan.tasks
    .filter((t) => t.startDate <= date && t.endDate >= date)
    .toSorted((a, b) => a.time.localeCompare(b.time));
}
export function isComplete(
  record: CareRecord,
  taskId: string,
  date: string,
): boolean {
  return record.completions.some((c) => c.taskId === taskId && c.date === date);
}
export function medicationStock(
  record: CareRecord,
  medicationId: string,
  date: string,
) {
  const med = record.plan.medications.find((m) => m.id === medicationId);
  if (!med) return { remaining: 0, daysLeft: null as number | null };
  const linkedTasks = record.plan.tasks.filter(
    (t) => t.kind === "medication" && t.medicationId === med.id,
  );
  const taskIds = new Set(linkedTasks.map((t) => t.id));
  const used =
    record.completions.filter((c) => taskIds.has(c.taskId)).length *
    med.unitsPerDose;
  const added = (record.refills || [])
    .filter((r) => r.medicationId === med.id)
    .reduce((total, r) => total + r.quantity, 0);
  const remaining = Math.max(0, med.quantity + added - used);
  const dosesToday = linkedTasks.filter(
    (t) => t.startDate <= date && t.endDate >= date,
  ).length;
  return {
    remaining,
    daysLeft: dosesToday
      ? Math.floor(remaining / (dosesToday * med.unitsPerDose))
      : null,
  };
}
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export type Reminder = {
  key: string;
  recordId: string;
  title: string;
  body: string;
};
export function dueReminders(record: CareRecord, now: Date): Reminder[] {
  const date = dateInZone(now, record.timezone),
    time = timeInZone(now, record.timezone);
  const minute = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const current = minute(time);
  const reminders: Reminder[] = [];
  for (const task of tasksOnDate(record, date)) {
    const sinceDue = current - minute(task.time);
    if (sinceDue >= 0 && sinceDue < 15 && !isComplete(record, task.id, date))
      reminders.push({
        key: `${record.id}:task:${task.id}:${date}`,
        recordId: record.id,
        title: "A reminder from After Care",
        body: "A task in your care plan is due. Open After Care to review it.",
      });
    if (sinceDue >= 60 && sinceDue < 75 && !isComplete(record, task.id, date))
      reminders.push({
        key: `${record.id}:missed:${task.id}:${date}`,
        recordId: record.id,
        title: "Your care plan check-in",
        body: "A scheduled task has not been marked complete. Open After Care to check in.",
      });
  }
  // Send inventory and appointment reminders once in the morning, in the patient’s timezone.
  if (current >= 9 * 60 && current < 9 * 60 + 15) {
    for (const med of record.plan.medications) {
      const stock = medicationStock(record, med.id, date);
      if (stock.daysLeft !== null && stock.daysLeft <= med.refillThreshold)
        reminders.push({
          key: `${record.id}:refill:${med.id}:${date}`,
          recordId: record.id,
          title: "Check your medication supply",
          body: "A medication may need a refill soon. Review your supply in After Care.",
        });
    }
    for (const a of record.plan.appointments)
      if (a.date === addDays(date, 1) || (a.date === date && a.time >= time))
        reminders.push({
          key: `${record.id}:appointment:${a.id}:${date}`,
          recordId: record.id,
          title: "An upcoming care appointment",
          body: "You have an appointment coming up. Open After Care for the details.",
        });
  }
  return reminders;
}
