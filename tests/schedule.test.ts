import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemoRecord } from "../src/lib/demo";
import {
  addDays,
  dateInZone,
  dueReminders,
  formatTime,
  isComplete,
  medicationStock,
  tasksOnDate,
  timeInZone,
} from "../src/lib/schedule";
import { dischargeSchema, planSchema } from "../src/lib/types";

test("patient timezone determines the occurrence date at midnight", () => {
  const now = new Date("2026-10-24T20:00:00Z");
  assert.equal(dateInZone(now, "Asia/Kolkata"), "2026-10-25");
  assert.equal(timeInZone(now, "Asia/Kolkata"), "01:30");
  assert.equal(dateInZone(now, "America/New_York"), "2026-10-24");
});
test("date arithmetic is stable across month boundaries and leap years", () => {
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("a completion is specific to its scheduled day and reduces medication stock", () => {
  const record = createDemoRecord(),
    date = dateInZone(new Date(), record.timezone);
  assert.equal(isComplete(record, "task-1", date), true);
  assert.equal(isComplete(record, "task-1", addDays(date, 1)), false);
  assert.deepEqual(medicationStock(record, "med-1", date), {
    remaining: 10,
    daysLeft: 3,
  });
  assert.equal(tasksOnDate(record, addDays(date, 100)).length, 0);
});
test("reminders are due only inside the window and completed doses are excluded", () => {
  const record = createDemoRecord();
  const today = dateInZone(new Date(), record.timezone);
  const due = dueReminders(record, new Date(`${today}T07:35:00Z`)); // 13:05 India
  assert.equal(due.filter((r) => r.key.includes(":task:task-3:")).length, 1);
  assert.equal(
    due.every(
      (r) => !r.body.includes("Paracetamol") && !r.body.includes("Alex"),
    ),
    true,
  );
  record.completions.push({
    taskId: "task-3",
    date: today,
    completedAt: new Date().toISOString(),
    completedBy: "demo-patient",
  });
  assert.equal(
    dueReminders(record, new Date(`${today}T07:35:00Z`)).filter((r) =>
      r.key.includes(":task:task-3:"),
    ).length,
    0,
  );
});
test("missed-task follow-ups are distinct and refill alerts use recorded stock", () => {
  const record = createDemoRecord(),
    today = dateInZone(new Date(), record.timezone);
  assert.equal(
    dueReminders(record, new Date(`${today}T08:35:00Z`)).some((r) =>
      r.key.includes(":missed:task-3:"),
    ),
    true,
  );
  assert.equal(
    dueReminders(record, new Date(`${today}T03:35:00Z`)).some((r) =>
      r.key.includes(":refill:med-1:"),
    ),
    true,
  );
});
test("unlinked medication tasks, duplicate IDs, and reversed treatment dates are rejected", () => {
  const { plan } = createDemoRecord();
  assert.equal(
    planSchema.safeParse({ ...plan, medications: [] }).success,
    false,
  );
  assert.equal(
    planSchema.safeParse({ ...plan, tasks: [...plan.tasks, plan.tasks[0]] })
      .success,
    false,
  );
  assert.equal(
    planSchema.safeParse({
      ...plan,
      tasks: [
        { ...plan.tasks[0], startDate: "2026-10-30", endDate: "2026-10-01" },
      ],
    }).success,
    false,
  );
});
test("publishing requires review and separate caregiver credentials", () => {
  const record = createDemoRecord();
  assert.equal(
    dischargeSchema.safeParse({ ...record, reviewed: false }).success,
    false,
  );
  assert.equal(
    dischargeSchema.safeParse({
      ...record,
      reviewed: true,
      caregiverEmail: record.email,
    }).success,
    false,
  );
  assert.equal(
    dischargeSchema.safeParse({ ...record, reviewed: true }).success,
    true,
  );
});
test("display time handles noon and midnight", () => {
  assert.equal(formatTime("00:00"), "12:00 AM");
  assert.equal(formatTime("12:30"), "12:30 PM");
});

test("morning appointment notices do not describe an elapsed visit as upcoming", () => {
  const record = createDemoRecord(),
    today = dateInZone(new Date(), record.timezone);
  record.plan.appointments[0] = {
    ...record.plan.appointments[0],
    date: today,
    time: "08:00",
  };
  assert.equal(
    dueReminders(record, new Date(`${today}T03:35:00Z`)).some((r) =>
      r.key.includes(":appointment:"),
    ),
    false,
  );
});

test("refills increase estimated supply without changing the prescribed dose", () => {
  const record = createDemoRecord(),
    date = dateInZone(new Date(), record.timezone);
  record.refills = [
    {
      id: "refill-1",
      medicationId: "med-1",
      quantity: 20,
      addedAt: new Date().toISOString(),
      addedBy: "demo-caregiver",
    },
  ];
  assert.deepEqual(medicationStock(record, "med-1", date), {
    remaining: 30,
    daysLeft: 10,
  });
  assert.equal(record.plan.medications[0].unitsPerDose, 1);
});
