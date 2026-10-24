"use client";
import { Plus, Trash2, Pill, CalendarDays, ClipboardList } from "lucide-react";
import type { Plan } from "@/lib/types";
import { addDays } from "@/lib/schedule";
export function PlanEditor({
  value,
  onChange,
  date,
}: {
  value: Plan;
  onChange: (plan: Plan) => void;
  date: string;
}) {
  const update = <K extends keyof Plan>(key: K, next: Plan[K]) =>
    onChange({ ...value, [key]: next });
  function med(index: number, field: string, next: string | number) {
    update(
      "medications",
      value.medications.map((m, i) =>
        i === index ? { ...m, [field]: next } : m,
      ),
    );
  }
  function task(index: number, field: string, next: string) {
    update(
      "tasks",
      value.tasks.map((t, i) =>
        i === index
          ? {
              ...t,
              [field]: next,
              ...(field === "kind" && next !== "medication"
                ? { medicationId: undefined }
                : {}),
            }
          : t,
      ),
    );
  }
  function appointment(index: number, field: string, next: string) {
    update(
      "appointments",
      value.appointments.map((a, i) =>
        i === index ? { ...a, [field]: next } : a,
      ),
    );
  }
  return (
    <div className="plan-editor">
      <label>
        Recovery summary
        <textarea
          value={value.summary}
          onChange={(e) => update("summary", e.target.value)}
          rows={2}
          maxLength={2000}
        />
      </label>
      <div className="editor-heading">
        <h3>
          <Pill size={18} />
          Medications
        </h3>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            update("medications", [
              ...value.medications,
              {
                id: crypto.randomUUID(),
                name: "",
                dose: "",
                instructions: "",
                unitsPerDose: 1,
                quantity: 0,
                refillThreshold: 3,
              },
            ])
          }
        >
          <Plus size={15} />
          Add medication
        </button>
      </div>
      {value.medications.map((m, i) => (
        <div className="editor-item" key={m.id}>
          <div className="editor-item-head">
            <strong>Medication {i + 1}</strong>
            <button
              className="icon-button danger"
              type="button"
              aria-label={`Remove medication ${i + 1}`}
              onClick={() =>
                onChange({
                  ...value,
                  medications: value.medications.filter((_, n) => n !== i),
                  tasks: value.tasks.filter((t) => t.medicationId !== m.id),
                })
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Name
              <input
                value={m.name}
                onChange={(e) => med(i, "name", e.target.value)}
                required
                maxLength={2000}
              />
            </label>
            <label>
              Prescribed dose
              <input
                value={m.dose}
                onChange={(e) => med(i, "dose", e.target.value)}
                required
                placeholder="Exactly as prescribed"
                maxLength={2000}
              />
            </label>
            <label>
              Units per dose
              <input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={m.unitsPerDose}
                onChange={(e) => med(i, "unitsPerDose", Number(e.target.value))}
                required
              />
            </label>
            <label>
              Starting quantity (same units)
              <input
                type="number"
                min="0"
                max="100000"
                step="0.01"
                value={m.quantity}
                onChange={(e) => med(i, "quantity", Number(e.target.value))}
                required
              />
            </label>
            <label className="full-width">
              Instructions
              <input
                value={m.instructions}
                onChange={(e) => med(i, "instructions", e.target.value)}
                maxLength={2000}
              />
            </label>
            <label>
              Refill reminder (days left)
              <input
                type="number"
                min="1"
                max="30"
                value={m.refillThreshold}
                onChange={(e) =>
                  med(i, "refillThreshold", Number(e.target.value))
                }
              />
            </label>
          </div>
        </div>
      ))}
      {!value.medications.length && (
        <p className="editor-empty">
          No medications added. Add only those prescribed at discharge.
        </p>
      )}
      <div className="editor-heading">
        <h3>
          <ClipboardList size={18} />
          Daily reminders
        </h3>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            update("tasks", [
              ...value.tasks,
              {
                id: crypto.randomUUID(),
                title: "",
                kind: "care",
                time: "",
                instructions: "",
                startDate: date,
                endDate: date,
              },
            ])
          }
        >
          <Plus size={15} />
          Add reminder
        </button>
      </div>
      {value.tasks.map((t, i) => (
        <div className="editor-item" key={t.id}>
          <div className="editor-item-head">
            <strong>Reminder {i + 1}</strong>
            <button
              type="button"
              className="icon-button danger"
              aria-label={`Remove reminder ${i + 1}`}
              onClick={() =>
                update(
                  "tasks",
                  value.tasks.filter((_, n) => n !== i),
                )
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Task title
              <input
                required
                value={t.title}
                maxLength={2000}
                onChange={(e) => task(i, "title", e.target.value)}
              />
            </label>
            <label>
              Type
              <select
                value={t.kind}
                onChange={(e) => task(i, "kind", e.target.value)}
              >
                <option value="medication">Medication</option>
                <option value="movement">Physiotherapy / movement</option>
                <option value="care">Care task</option>
                <option value="check-in">Check-in</option>
              </select>
            </label>
            {t.kind === "medication" && (
              <label className="full-width">
                Linked medication
                <select
                  required
                  value={t.medicationId || ""}
                  onChange={(e) => task(i, "medicationId", e.target.value)}
                >
                  <option value="">Choose prescribed medication</option>
                  {value.medications.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || "Unnamed medication"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Time (patient’s timezone)
              <input
                type="time"
                required
                value={t.time}
                onChange={(e) => task(i, "time", e.target.value)}
              />
            </label>
            <label>
              Instructions
              <input
                value={t.instructions}
                maxLength={2000}
                onChange={(e) => task(i, "instructions", e.target.value)}
              />
            </label>
            <label>
              Start date
              <input
                type="date"
                required
                value={t.startDate}
                onChange={(e) => task(i, "startDate", e.target.value)}
              />
            </label>
            <label>
              End date (inclusive)
              <input
                type="date"
                min={t.startDate}
                required
                value={t.endDate}
                onChange={(e) => task(i, "endDate", e.target.value)}
              />
            </label>
          </div>
        </div>
      ))}
      {!value.tasks.length && (
        <p className="editor-empty">
          No scheduled tasks yet. Add the prescribed times and dates before
          publishing.
        </p>
      )}
      <div className="editor-heading">
        <h3>
          <CalendarDays size={18} />
          Follow-up appointments
        </h3>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            update("appointments", [
              ...value.appointments,
              {
                id: crypto.randomUUID(),
                title: "",
                clinician: "",
                date: addDays(date, 7),
                time: "",
                location: "",
                notes: "",
              },
            ])
          }
        >
          <Plus size={15} />
          Add appointment
        </button>
      </div>
      {value.appointments.map((a, i) => (
        <div className="editor-item" key={a.id}>
          <div className="editor-item-head">
            <strong>Appointment {i + 1}</strong>
            <button
              type="button"
              className="icon-button danger"
              aria-label={`Remove appointment ${i + 1}`}
              onClick={() =>
                update(
                  "appointments",
                  value.appointments.filter((_, n) => n !== i),
                )
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="form-grid">
            {(
              [
                "title",
                "clinician",
                "date",
                "time",
                "location",
                "notes",
              ] as const
            ).map((field) => (
              <label key={field}>
                {
                  {
                    title: "Appointment title",
                    clinician: "Clinician",
                    date: "Date",
                    time: "Time",
                    location: "Location",
                    notes: "Preparation notes",
                  }[field]
                }
                <input
                  type={field === "date" || field === "time" ? field : "text"}
                  required={field !== "notes"}
                  value={a[field]}
                  maxLength={2000}
                  onChange={(e) => appointment(i, field, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <label>
        General care instructions{" "}
        <span className="field-hint">One instruction per line</span>
        <textarea
          rows={4}
          value={value.instructions.join("\n")}
          onChange={(e) => update("instructions", e.target.value.split("\n"))}
        />
      </label>
      <label>
        Warning signs and contact guidance{" "}
        <span className="field-hint">
          Use your hospital’s discharge instructions. One per line.
        </span>
        <textarea
          rows={3}
          value={value.warningSigns.join("\n")}
          onChange={(e) => update("warningSigns", e.target.value.split("\n"))}
        />
      </label>
    </div>
  );
}
