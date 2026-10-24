"use client";
import { useState } from "react";
import {
  Pill,
  CalendarDays,
  Check,
  ChevronRight,
  Sparkles,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Phone,
  AlertCircle,
  ClipboardList,
  MapPin,
  Clock,
  Download,
  Users,
} from "lucide-react";
import type { CareRecord, Task } from "@/lib/types";
import {
  dayNumber,
  formatDate,
  formatTime,
  isComplete,
  medicationStock,
  tasksOnDate,
} from "@/lib/schedule";
import { api, initials } from "@/lib/client";
import { Schedule } from "./schedule";
import { ArrowLink, EmptyState, Modal, Spinner } from "./ui";
export type Section =
  | "overview"
  | "care"
  | "medications"
  | "appointments"
  | "team"
  | "assistant"
  | "patients";

export function TeamList({
  record,
  onSelect,
}: {
  record: CareRecord;
  onSelect?: () => void;
}) {
  return (
    <div className="team-list">
      {[
        { name: record.nurseName, role: "Discharge nurse", tone: "blue" },
        ...(record.caregiverName
          ? [{ name: record.caregiverName, role: "Caregiver", tone: "sand" }]
          : []),
      ].map((person) => (
        <button key={person.role} className="team-person" onClick={onSelect}>
          <span className={`avatar ${person.tone}`}>
            {initials(person.name)}
          </span>
          <span className="team-person-name">
            <strong>{person.name}</strong>
            <small>{person.role}</small>
          </span>
          {onSelect && <ChevronRight size={18} />}
        </button>
      ))}
    </div>
  );
}
export function Overview({
  record,
  today,
  navigate,
  onComplete,
  readonly,
}: {
  record: CareRecord;
  today: string;
  navigate: (section: Section, prompt?: string) => void;
  onComplete: (task: Task) => Promise<void>;
  readonly: boolean;
}) {
  const tasks = tasksOnDate(record, today),
    done = tasks.filter((t) => isComplete(record, t.id, today)).length;
  const next = tasks.find(
    (t) => t.kind === "medication" && !isComplete(record, t.id, today),
  );
  const appointment = record.plan.appointments
    .filter((a) => a.date >= today)
    .toSorted((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
    )[0];
  const refill = record.plan.medications.find((m) => {
    const stock = medicationStock(record, m.id, today);
    return stock.daysLeft !== null && stock.daysLeft <= m.refillThreshold;
  });
  return (
    <>
      <section className="recovery-banner">
        <div>
          <h2>Every small step is progress.</h2>
          <p>
            You’re on day {dayNumber(record, today)} of your recovery. Let’s
            make today a good one.
          </p>
          <button
            className="button button-outline"
            onClick={() => navigate("care")}
          >
            View my care plan
          </button>
        </div>
      </section>
      <div className="stats-grid">
        <div className="stat-panel">
          <div
            className="progress-ring"
            style={
              {
                "--progress": `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
              } as React.CSSProperties
            }
          >
            <span />
          </div>
          <div className="stat-body">
            <p>Today’s progress</p>
            <h3>
              {done} of {tasks.length} tasks complete
            </h3>
            <div className="progress-track">
              <span
                style={{
                  width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
        <button className="stat-panel" onClick={() => navigate("medications")}>
          <span className="icon-tile blue">
            <Pill size={25} />
          </span>
          <div className="stat-body">
            <p>Next medication</p>
            <h3 className="stat-value">
              {next ? formatTime(next.time) : "All caught up"}
            </h3>
            <small>
              {next
                ? next.instructions.split("·").at(-1)?.trim()
                : "One less thing to think about"}
            </small>
          </div>
        </button>
        <button className="stat-panel" onClick={() => navigate("appointments")}>
          <span className="icon-tile blue">
            <CalendarDays size={25} />
          </span>
          <div className="stat-body">
            <p>Next follow-up</p>
            <h3 className="stat-value">
              {appointment ? formatDate(appointment.date) : "None scheduled"}
            </h3>
            <small>
              {appointment?.clinician || "Your care team will let you know"}
            </small>
          </div>
        </button>
      </div>
      <div className="dashboard-columns">
        <Schedule
          record={record}
          today={today}
          onComplete={onComplete}
          onFull={() => navigate("care")}
          readonly={readonly}
        />
        <div className="support-column">
          <section className="panel assistant-card">
            <div className="assistant-heading">
              <span className="sparkle-circle">
                <Sparkles size={24} />
              </span>
              <h2>A little help, whenever you need it.</h2>
            </div>
            <p>
              Questions about your care plan? Your care assistant is here for
              you.
            </p>
            <div className="prompt-chips">
              <button
                onClick={() => navigate("assistant", "What’s my next step?")}
              >
                <MessageSquare size={17} />
                <span>What’s my next step?</span>
                <ChevronRight size={15} />
              </button>
              <button
                onClick={() =>
                  navigate("assistant", "Help with my medications")
                }
              >
                <Pill size={17} />
                <span>Help with my medications</span>
                <ChevronRight size={15} />
              </button>
            </div>
            <ArrowLink onClick={() => navigate("assistant")}>
              Ask your care assistant
            </ArrowLink>
          </section>
          <section className="panel team-card">
            <div className="section-top">
              <h2>Your care team</h2>
              <button
                className="icon-button"
                aria-label="View care team"
                onClick={() => navigate("team")}
              >
                <Users size={18} />
              </button>
            </div>
            <TeamList record={record} onSelect={() => navigate("team")} />
          </section>
          {refill && (
            <section className="refill-card">
              <span className="icon-tile amber">
                <Pill size={22} />
              </span>
              <div>
                <h3>A heads-up for your next refill</h3>
                <p>
                  One of your medications has{" "}
                  {medicationStock(record, refill.id, today).daysLeft} days
                  remaining.
                </p>
              </div>
              <button
                className="text-button"
                onClick={() => navigate("medications")}
              >
                Review medications
                <ArrowRight size={15} />
              </button>
            </section>
          )}
          <div className="review-note">
            <ShieldCheck size={15} />
            <span>Your plan, reviewed by your care team.</span>
          </div>
        </div>
      </div>
    </>
  );
}
export function CarePlan({
  record,
  today,
  onComplete,
  readonly,
}: {
  record: CareRecord;
  today: string;
  onComplete: (task: Task) => Promise<void>;
  readonly: boolean;
}) {
  return (
    <div className="care-layout">
      <div>
        <section className="panel plan-summary">
          <div className="section-top">
            <div>
              <h2>Your recovery plan</h2>
              <p>{record.diagnosis}</p>
            </div>
            <span className="icon-tile">
              <ClipboardList size={23} />
            </span>
          </div>
          <p className="plan-summary-text">
            {record.plan.summary ||
              "Your nurse-reviewed instructions are below."}
          </p>
          <div className="plan-meta">
            <span>Discharged {formatDate(record.dischargeDate)}</span>
            <span>Reviewed by {record.nurseName}</span>
          </div>
          {record.plan.instructions.length > 0 && (
            <>
              <h3>The things to keep in mind</h3>
              <ul className="instruction-list">
                {record.plan.instructions.map((instruction, i) => (
                  <li key={i}>
                    <Check size={16} />
                    <span>{instruction}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <section className="panel print-only print-plan-details">
          <h2>Prescribed medications</h2>
          {record.plan.medications.map((m) => (
            <div key={m.id}>
              <h3>
                {m.name} · {m.dose}
              </h3>
              <p>{m.instructions}</p>
            </div>
          ))}
          <h2>Follow-up appointments</h2>
          {record.plan.appointments.map((a) => (
            <div key={a.id}>
              <h3>{a.title}</h3>
              <p>
                {formatDate(a.date)} · {formatTime(a.time)} · {record.timezone}
                <br />
                {a.clinician} · {a.location}
                <br />
                {a.notes}
              </p>
            </div>
          ))}
        </section>
        <Schedule
          record={record}
          today={today}
          onComplete={onComplete}
          expanded
          readonly={readonly}
        />
      </div>
      <aside>
        <section className="panel warning-panel">
          <span className="icon-tile amber">
            <AlertCircle size={23} />
          </span>
          <h2>When to reach out</h2>
          {record.plan.warningSigns.length ? (
            record.plan.warningSigns.map((warning, i) => (
              <p key={i}>{warning}</p>
            ))
          ) : (
            <p>
              Your care team hasn’t added warning signs. Use the contact
              guidance in your written discharge summary.
            </p>
          )}
          <p className="small muted">
            For a medical emergency, contact your local emergency service. This
            app does not monitor emergencies.
          </p>
          {record.contactPhone && (
            <a
              className="button button-outline"
              href={`tel:${record.contactPhone.replace(/[^\d+]/g, "")}`}
            >
              <Phone size={16} />
              Call your care team
            </a>
          )}
        </section>
        <button
          className="download-plan button button-outline"
          onClick={() => window.print()}
        >
          <Download size={17} />
          Print my care plan
        </button>
      </aside>
    </div>
  );
}
export function Medications({
  record,
  today,
  readonly = false,
  onUpdate,
}: {
  record: CareRecord;
  today: string;
  readonly?: boolean;
  onUpdate: (record: CareRecord) => void;
}) {
  const [refill, setRefill] = useState<{
    medicationId: string;
    requestId: string;
  } | null>(null);
  const [quantity, setQuantity] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function saveRefill(event: React.FormEvent) {
    event.preventDefault();
    if (!refill) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ record: CareRecord }>(
        `/api/discharges/${record.id}/refill`,
        { ...refill, quantity },
      );
      onUpdate(result.record);
      setRefill(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!record.plan.medications.length)
    return (
      <section className="panel">
        <EmptyState icon={<Pill size={30} />} title="No medications recorded">
          Your nurse will add medications here if they are part of your care
          plan.
        </EmptyState>
      </section>
    );
  return (
    <>
      <div className="info-strip">
        <ShieldCheck size={18} />
        <span>
          Follow your hospital’s prescription. Contact your care team before
          changing or stopping a medication.
        </span>
      </div>
      <div className="medication-grid">
        {record.plan.medications.map((med) => {
          const stock = medicationStock(record, med.id, today);
          const tasks = record.plan.tasks.filter(
            (t) => t.medicationId === med.id,
          );
          const low =
            stock.daysLeft !== null && stock.daysLeft <= med.refillThreshold;
          return (
            <section className="panel medication-card" key={med.id}>
              <div className="section-top">
                <span className="icon-tile blue">
                  <Pill size={25} />
                </span>
                {low && <span className="status-pill amber">Refill soon</span>}
              </div>
              <h2>{med.name}</h2>
              <p className="medication-dose">{med.dose}</p>
              <p>{med.instructions}</p>
              <div className="medication-times">
                {tasks.length ? (
                  tasks.map((t) => (
                    <span key={t.id}>
                      <Clock size={14} />
                      {formatTime(t.time)}
                    </span>
                  ))
                ) : (
                  <span>No scheduled reminder</span>
                )}
              </div>
              <div className="inventory">
                <div>
                  <span>Estimated supply</span>
                  <strong>{stock.remaining} units remaining</strong>
                </div>
                <span className={low ? "low-supply" : ""}>
                  {stock.daysLeft === null
                    ? "No active daily schedule"
                    : `About ${stock.daysLeft} days left`}
                </span>
              </div>
              {low && (
                <div className="refill-note">
                  A little planning helps. Contact your pharmacy or care team to
                  arrange a refill.
                </div>
              )}
              <p className="small muted">
                Based on the starting quantity, refills, and recorded doses.
                Check your actual supply too.
              </p>
              {!readonly && (
                <button
                  className="button button-outline record-refill"
                  onClick={() => {
                    setRefill({
                      medicationId: med.id,
                      requestId: crypto.randomUUID(),
                    });
                    setQuantity(1);
                    setError("");
                  }}
                >
                  <Pill size={16} />
                  Record a refill
                </button>
              )}
            </section>
          );
        })}
      </div>
      {refill && (
        <Modal
          title="A little more peace of mind."
          onClose={() => {
            if (!busy) setRefill(null);
          }}
        >
          <form onSubmit={saveRefill}>
            <p>
              Record medication you have already received. This updates the
              estimated supply for you and your caregiver.
            </p>
            <div className="refill-form">
              <h3>
                {
                  record.plan.medications.find(
                    (m) => m.id === refill.medicationId,
                  )?.name
                }
              </h3>
              <label>
                Quantity received
                <input
                  autoFocus
                  type="number"
                  min="0.01"
                  max="100000"
                  step="0.01"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </label>
              <p className="small muted">
                Use the same units as the starting supply in your care plan.
                Recording a refill does not change your prescribed dose or
                schedule.
              </p>
            </div>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                disabled={busy}
                className="button button-outline"
                onClick={() => setRefill(null)}
              >
                Cancel
              </button>
              <button className="button" disabled={busy}>
                {busy ? <Spinner /> : <Check size={16} />}Record medication
                received
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Appointments({
  record,
  today,
}: {
  record: CareRecord;
  today: string;
}) {
  const appointments = record.plan.appointments.toSorted((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  );
  function calendar(appointment: (typeof appointments)[number]) {
    const escape = (s: string) =>
      s
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
    const start =
      appointment.date.replace(/-/g, "") +
      "T" +
      appointment.time.replace(":", "") +
      "00";
    const contents = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//After Care//Care Plan//EN\r\nBEGIN:VEVENT\r\nUID:${appointment.id}@aftercare\r\nDTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(
        /\.\d{3}/,
        "",
      )}\r\nDTSTART;TZID=${record.timezone}:${start}\r\nSUMMARY:${escape(appointment.title)}\r\nLOCATION:${escape(appointment.location)}\r\nDESCRIPTION:${escape(`${appointment.clinician}. ${appointment.notes}`)}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
    const url = URL.createObjectURL(
        new Blob([contents], { type: "text/calendar" }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = "aftercare-appointment.ics";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="appointments-list">
      {appointments.length ? (
        appointments.map((a) => (
          <section className="panel appointment-card" key={a.id}>
            <div className="calendar-block">
              <span>{formatDate(a.date, { month: "short" })}</span>
              <strong>{new Date(`${a.date}T12:00:00Z`).getUTCDate()}</strong>
            </div>
            <div className="appointment-copy">
              <span className="muted small">
                {a.date < today
                  ? "Past appointment"
                  : "Your next step in recovery"}
              </span>
              <h2>{a.title}</h2>
              <p>{a.clinician}</p>
              <div className="appointment-details">
                <span>
                  <Clock size={16} />
                  {formatTime(a.time)} · {record.timezone}
                </span>
                <span>
                  <MapPin size={16} />
                  {a.location}
                </span>
              </div>
              {a.notes && <div className="appointment-note">{a.notes}</div>}
            </div>
            <button
              className="button button-outline"
              onClick={() => calendar(a)}
            >
              <CalendarDays size={17} />
              Add to calendar
            </button>
          </section>
        ))
      ) : (
        <section className="panel">
          <EmptyState
            icon={<CalendarDays size={30} />}
            title="No appointments yet"
          >
            Your care team will add your follow-up details here.
          </EmptyState>
        </section>
      )}
    </div>
  );
}
export function CareTeam({ record }: { record: CareRecord }) {
  return (
    <div className="care-layout">
      <section className="panel team-detail">
        <h2>You have people in your corner.</h2>
        <p>Your hospital and caregiver, connected around your recovery.</p>
        <TeamList record={record} />
        {record.contactPhone && (
          <a
            className="button button-outline"
            href={`tel:${record.contactPhone.replace(/[^\d+]/g, "")}`}
          >
            <Phone size={17} />
            {record.contactPhone}
          </a>
        )}
        {record.caregiverEmail && (
          <div className="team-note">
            <Users size={20} />
            <div>
              <h3>A shared plan, a little less to carry.</h3>
              <p>
                {record.caregiverName} can sign in with their own
                hospital-issued credentials to view your plan, receive
                reminders, and help record completed tasks.
              </p>
            </div>
          </div>
        )}
      </section>
      <section className="panel warning-panel">
        <ShieldCheck size={26} />
        <h2>Connected with care</h2>
        <p>
          Check-offs are shared between you and your caregiver. You’ll both see
          the same medication and recovery schedule.
        </p>
        <p className="muted small">
          For clinical questions, contact your hospital using the details in
          your discharge summary. The assistant cannot message your care team.
        </p>
      </section>
    </div>
  );
}
