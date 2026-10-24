import { z } from "zod";

const text = z.string().trim().max(2000);
export const taskSchema = z
  .object({
    id: z.string().min(1).max(80),
    title: text.min(1),
    kind: z.enum(["medication", "movement", "care", "check-in"]),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    instructions: text,
    medicationId: z.string().max(80).optional(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
  })
  .refine((t) => t.endDate >= t.startDate, {
    message: "End date must follow start date.",
  });
export const medicationSchema = z.object({
  id: z.string().min(1).max(80),
  name: text.min(1),
  dose: text.min(1),
  instructions: text,
  unitsPerDose: z.number().positive().max(100),
  quantity: z.number().nonnegative().max(100000),
  refillThreshold: z.number().int().min(1).max(30),
});
export const appointmentSchema = z.object({
  id: z.string().min(1).max(80),
  title: text.min(1),
  clinician: text.min(1),
  date: z.iso.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  location: text.min(1),
  notes: text,
});
export const planSchema = z
  .object({
    summary: text,
    instructions: z.array(text.min(1)).max(30),
    warningSigns: z.array(text.min(1)).max(20),
    tasks: z.array(taskSchema).max(40),
    medications: z.array(medicationSchema).max(20),
    appointments: z.array(appointmentSchema).max(20),
  })
  .superRefine((plan, ctx) => {
    for (const key of ["tasks", "medications", "appointments"] as const) {
      const ids = plan[key].map((x) => x.id);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({
          code: "custom",
          message: `Duplicate ${key} IDs.`,
          path: [key],
        });
    }
    for (const [i, task] of plan.tasks.entries()) {
      if (
        task.kind === "medication" &&
        (!task.medicationId ||
          !plan.medications.some((m) => m.id === task.medicationId))
      )
        ctx.addIssue({
          code: "custom",
          message: "Link each medication task to a medication.",
          path: ["tasks", i],
        });
    }
  });
export const dischargeSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(200),
    diagnosis: text.min(2),
    dischargeDate: z.iso.date(),
    timezone: z.string().refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Use a valid timezone."),
    caregiverName: z.string().trim().max(100),
    caregiverEmail: z.union([z.literal(""), z.email().max(200)]),
    nurseName: z.string().trim().min(2).max(100),
    contactPhone: z.string().max(40),
    sourceNotes: z.string().trim().min(10).max(20000),
    plan: planSchema,
    reviewed: z.literal(true),
  })
  .refine(
    (x) =>
      !x.caregiverEmail ||
      x.caregiverEmail.toLowerCase() !== x.email.toLowerCase(),
    { message: "Use separate patient and caregiver email addresses." },
  )
  .refine((x) => !x.caregiverEmail || x.caregiverName.length >= 2, {
    message: "Add the caregiver’s name.",
  });

export type Plan = z.infer<typeof planSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Medication = z.infer<typeof medicationSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type DischargeInput = z.infer<typeof dischargeSchema>;
export type Role = "patient" | "caregiver" | "nurse";
export type Completion = {
  taskId: string;
  date: string;
  completedAt: string;
  completedBy: string;
};
export type Refill = {
  id: string;
  medicationId: string;
  quantity: number;
  addedAt: string;
  addedBy: string;
};
export type CareRecord = Omit<DischargeInput, "reviewed"> & {
  id: string;
  nurseId: string;
  patientUserId: string;
  caregiverUserId?: string;
  createdAt: string;
  completions: Completion[];
  refills?: Refill[];
};
export type Viewer = { id: string; name: string; role: Role; demo: boolean };
export type Workspace = {
  viewer: Viewer;
  records: CareRecord[];
  aiConfigured: boolean;
  pushConfigured: boolean;
};
export type Credentials = {
  email: string;
  password: string;
  role: "patient" | "caregiver";
};
