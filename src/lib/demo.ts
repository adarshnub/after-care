import type { CareRecord, Plan } from "./types";
import { addDays, dateInZone } from "./schedule";

export function createDemoRecord(): CareRecord {
  const today = dateInZone(new Date(), "Asia/Kolkata"),
    start = addDays(today, -4),
    end = addDays(today, 14);
  const plan: Plan = {
    summary:
      "Your recovery after knee surgery, with a little support at every step.",
    instructions: [
      "Follow the medication schedule provided by your discharge nurse.",
      "Complete only the movements demonstrated by your physiotherapist.",
      "Keep your dressing clean and dry as instructed by your care team.",
      "Use your prescribed walking support and ask your caregiver for help when needed.",
    ],
    warningSigns: [
      "Contact your hospital for new or worsening symptoms, a change around your wound, or concerns about your recovery.",
      "For severe symptoms or a medical emergency, contact your local emergency service immediately.",
    ],
    medications: [
      {
        id: "med-1",
        name: "Paracetamol",
        dose: "500 mg · 1 tablet",
        instructions:
          "After food. Follow the hospital prescription. This is a fictional demo record.",
        unitsPerDose: 1,
        quantity: 11,
        refillThreshold: 3,
      },
      {
        id: "med-2",
        name: "Vitamin D3",
        dose: "1,000 IU · 1 tablet",
        instructions: "After breakfast, as prescribed in this fictional demo.",
        unitsPerDose: 1,
        quantity: 30,
        refillThreshold: 5,
      },
    ],
    tasks: [
      {
        id: "task-1",
        title: "Morning medications",
        kind: "medication",
        time: "08:00",
        instructions: "Paracetamol · 1 tablet · After breakfast",
        medicationId: "med-1",
        startDate: start,
        endDate: end,
      },
      {
        id: "task-2",
        title: "A little movement",
        kind: "movement",
        time: "10:00",
        instructions:
          "Physiotherapy · 15 minutes · Follow your therapist’s routine",
        startDate: start,
        endDate: end,
      },
      {
        id: "task-3",
        title: "Afternoon medications",
        kind: "medication",
        time: "13:00",
        instructions: "Paracetamol · 1 tablet · After lunch",
        medicationId: "med-1",
        startDate: start,
        endDate: end,
      },
      {
        id: "task-4",
        title: "Time to stretch",
        kind: "movement",
        time: "16:00",
        instructions:
          "Physiotherapy · 10 minutes · As demonstrated by your therapist",
        startDate: start,
        endDate: end,
      },
      {
        id: "task-5",
        title: "Evening medications",
        kind: "medication",
        time: "20:00",
        instructions: "Paracetamol · 1 tablet · After dinner",
        medicationId: "med-1",
        startDate: start,
        endDate: end,
      },
      {
        id: "task-6",
        title: "Your evening check-in",
        kind: "check-in",
        time: "21:00",
        instructions:
          "Check your dressing and note any questions for your care team",
        startDate: start,
        endDate: end,
      },
    ],
    appointments: [
      {
        id: "appointment-1",
        title: "Your recovery follow-up",
        clinician: "Dr. Sarah Chen",
        date: addDays(today, 4),
        time: "10:30",
        location: "Riverside Hospital · Orthopaedics, Floor 2",
        notes:
          "Bring your discharge summary, medication list, and any questions.",
      },
    ],
  };
  return {
    id: "demo-alex",
    name: "Alex Morgan",
    email: "alex@aftercare.demo",
    diagnosis: "Recovery following knee surgery",
    dischargeDate: start,
    timezone: "Asia/Kolkata",
    caregiverName: "Jamie Morgan",
    caregiverEmail: "jamie@aftercare.demo",
    nurseName: "Emily Wilson",
    contactPhone: "",
    sourceNotes:
      "Fictional demonstration discharge record. Follow the prescribed medication schedule and physiotherapy routine. Keep the dressing clean and dry. Attend the follow-up appointment.",
    plan,
    nurseId: "demo-nurse",
    patientUserId: "demo-patient",
    caregiverUserId: "demo-caregiver",
    createdAt: new Date().toISOString(),
    completions: [
      {
        taskId: "task-1",
        date: today,
        completedAt: `${today}T02:30:00Z`,
        completedBy: "demo-patient",
      },
      {
        taskId: "task-2",
        date: today,
        completedAt: `${today}T04:30:00Z`,
        completedBy: "demo-patient",
      },
    ],
  };
}
