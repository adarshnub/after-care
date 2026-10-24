"use client";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Mic,
  MicOff,
  ShieldCheck,
  Sparkles,
  FileText,
} from "lucide-react";
import { api } from "@/lib/client";
import { addDays, dateInZone } from "@/lib/schedule";
import {
  dischargeSchema,
  type CareRecord,
  type Credentials,
  type Plan,
  type Viewer,
} from "@/lib/types";
import { Modal, Spinner } from "./ui";
import { PlanEditor } from "./plan-editor";

type SpeechEngine = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        results: {
          [index: number]: { [index: number]: { transcript: string } };
          length: number;
        };
        resultIndex: number;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechEngine;
  webkitSpeechRecognition?: new () => SpeechEngine;
};
export function NewDischarge({
  viewer,
  aiConfigured,
  onClose,
  onCreated,
}: {
  viewer: Viewer;
  aiConfigured: boolean;
  onClose: () => void;
  onCreated: (record: CareRecord) => void;
}) {
  const today = dateInZone(new Date(), "Asia/Kolkata");
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [listening, setListening] = useState(false),
    [reviewed, setReviewed] = useState(false);
  const [details, setDetails] = useState({
    name: "",
    email: "",
    diagnosis: "",
    dischargeDate: today,
    timezone: "Asia/Kolkata",
    caregiverName: "",
    caregiverEmail: "",
    nurseName: viewer.name,
    contactPhone: "",
  });
  const [notes, setNotes] = useState(""),
    [plan, setPlan] = useState<Plan | null>(null),
    [clarifications, setClarifications] = useState<string[]>([]),
    [result, setResult] = useState<{
      record: CareRecord;
      credentials: Credentials[];
    } | null>(null),
    [copied, setCopied] = useState(false);
  const recognition = useRef<SpeechEngine | null>(null);
  const detail = (key: keyof typeof details, value: string) =>
    setDetails((current) => ({ ...current, [key]: value }));
  async function organize(manual = false) {
    if (notes.trim().length < 10) {
      setError("Add the nurse’s discharge instructions first.");
      return;
    }
    recognition.current?.stop();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ plan: Plan; clarifications: string[] }>(
        "/api/organize",
        {
          notes,
          dischargeDate: details.dischargeDate,
          timezone: details.timezone,
          mode: manual ? "manual" : "auto",
        },
      );
      setPlan(data.plan);
      setClarifications(data.clarifications);
      setReviewed(false);
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function dictate() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const win = window as SpeechWindow,
      Speech = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Speech) {
      setError(
        "Voice input is not supported in this browser. You can type the instructions, or use Chrome or Edge.",
      );
      return;
    }
    setError("");
    const engine = new Speech();
    recognition.current = engine;
    engine.continuous = true;
    engine.interimResults = false;
    engine.lang = "en-IN";
    engine.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++)
        transcript += event.results[i][0].transcript + " ";
      setNotes(
        (current) => `${current}${current ? "\n" : ""}${transcript.trim()}`,
      );
    };
    engine.onerror = () => {
      setListening(false);
      setError(
        "Voice input stopped. Check microphone permission or continue typing.",
      );
    };
    engine.onend = () => setListening(false);
    try {
      engine.start();
      setListening(true);
    } catch {
      setError("Couldn’t start the microphone. Please try typing instead.");
    }
  }
  function template() {
    setNotes(
      `Summary: Recovery plan provided at discharge.\nMedication: Example medicine | Enter prescribed dose | 1 | 14 | 08:00,20:00 | Enter prescribed instructions | ${addDays(details.dischargeDate, 7)}\nActivity: Prescribed movement | 10:00 | Enter therapist's instructions | ${addDays(details.dischargeDate, 7)}\nCare: Dressing check | 18:00 | Enter nurse's instructions | ${addDays(details.dischargeDate, 7)}\nFollow-up: Recovery follow-up | Enter clinician | ${addDays(details.dischargeDate, 7)} | 10:30 | Enter clinic | Bring discharge documents\nGeneral: Enter care instructions.\nWarning: Enter warning signs and hospital contact guidance.`,
    );
  }
  async function publish() {
    if (!plan) return;
    setBusy(true);
    setError("");
    try {
      const cleanPlan = {
        ...plan,
        instructions: plan.instructions.map((s) => s.trim()).filter(Boolean),
        warningSigns: plan.warningSigns.map((s) => s.trim()).filter(Boolean),
      };
      const parsed = dischargeSchema.safeParse({
        ...details,
        sourceNotes: notes,
        plan: cleanPlan,
        reviewed,
      });
      if (!parsed.success) {
        setError(
          parsed.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(" → ")}: ${i.message}`)
            .join(" "),
        );
        return;
      }
      const data = await api<{
        record: CareRecord;
        credentials: Credentials[];
      }>("/api/discharges", parsed.data);
      setResult(data);
      onCreated(data.record);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const link =
    typeof window === "undefined"
      ? "/login"
      : `${window.location.origin}/login`;
  function handoff() {
    return `After Care — ${details.name}\nSign in: ${link}\n\n${result?.credentials.map((c) => `${c.role === "patient" ? "Patient" : "Caregiver"}\nEmail: ${c.email}\nPassword: ${c.password}`).join("\n\n")}\n\nKeep these credentials private. Each person uses their own account. Open the link and install After Care from your browser to keep your plan close.\n${viewer.demo ? "\nDEMO ONLY — fictional information for local testing.\n" : ""}`;
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(handoff());
      setCopied(true);
    } catch {
      setError("Clipboard is unavailable. Use Download access sheet instead.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
        new Blob([handoff()], { type: "text/plain" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "aftercare-private-access.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Modal
      title={
        result ? "A thoughtful start to recovery." : "Create a discharge plan"
      }
      onClose={() => {
        if (!busy) {
          recognition.current?.stop();
          onClose();
        }
      }}
      wide
    >
      {result ? (
        <div className="discharge-success">
          <span className="success-mark">
            <CheckCircle2 size={34} />
          </span>
          <h3>{details.name}’s care plan is ready.</h3>
          <p>
            Share the sign-in link and each person’s own credentials through
            your hospital’s approved channel.
          </p>
          <div className="access-link">
            <span>Patient & caregiver sign-in</span>
            <strong>{link}</strong>
          </div>
          {result.credentials.map((c) => (
            <div className="credential-box" key={c.role}>
              <h4>
                {c.role === "patient" ? "Patient access" : "Caregiver access"}
              </h4>
              <dl>
                <div>
                  <dt>Email</dt>
                  <dd>{c.email}</dd>
                </div>
                <div>
                  <dt>Password</dt>
                  <dd className="credential-password">{c.password}</dd>
                </div>
              </dl>
            </div>
          ))}
          <p className="small muted">
            Passwords are shown once here. Copy or download the access sheet
            before closing.{" "}
            {viewer.demo && "These accounts work only in this local demo."}
          </p>
          {error && <p className="error-message">{error}</p>}
          <div className="modal-actions">
            <button className="button button-outline" onClick={download}>
              <Download size={17} />
              Download access sheet
            </button>
            <button className="button" onClick={copy}>
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? "Copied" : "Copy access details"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="modal-description">
            Give your patient a clear plan and a little peace of mind.
          </p>
          <div className="stepper">
            {[
              "Patient details",
              "Discharge instructions",
              "Review & share",
            ].map((label, i) => (
              <div
                className={i === step ? "current" : i < step ? "finished" : ""}
                key={label}
              >
                <span>{i < step ? <Check size={14} /> : i + 1}</span>
                <strong>{label}</strong>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 0) {
                setError("");
                setStep(1);
              } else if (step === 1) void organize();
              else void publish();
            }}
          >
            {step === 0 && (
              <>
                <h3 className="form-section-title">
                  A few details to make care personal.
                </h3>
                <div className="form-grid">
                  <label>
                    Patient’s full name
                    <input
                      autoFocus
                      required
                      value={details.name}
                      minLength={2}
                      maxLength={100}
                      onChange={(e) => detail("name", e.target.value)}
                      placeholder="e.g. Alex Morgan"
                    />
                  </label>
                  <label>
                    Patient’s email
                    <input
                      required
                      type="email"
                      value={details.email}
                      maxLength={200}
                      onChange={(e) => detail("email", e.target.value)}
                      placeholder="For their sign-in credentials"
                    />
                  </label>
                  <label className="full-width">
                    Discharge diagnosis / procedure
                    <input
                      required
                      minLength={2}
                      maxLength={2000}
                      value={details.diagnosis}
                      onChange={(e) => detail("diagnosis", e.target.value)}
                      placeholder="As recorded in the discharge summary"
                    />
                  </label>
                  <label>
                    Discharge date
                    <input
                      required
                      type="date"
                      value={details.dischargeDate}
                      onChange={(e) => detail("dischargeDate", e.target.value)}
                    />
                  </label>
                  <label>
                    Patient’s timezone
                    <select
                      value={details.timezone}
                      onChange={(e) => detail("timezone", e.target.value)}
                    >
                      {[
                        "Asia/Kolkata",
                        "Asia/Dubai",
                        "Asia/Singapore",
                        "Europe/London",
                        "America/New_York",
                        "America/Chicago",
                        "America/Los_Angeles",
                        "Australia/Sydney",
                        "UTC",
                      ].map((tz) => (
                        <option key={tz}>{tz}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <h3 className="form-section-title">
                  Someone in their corner{" "}
                  <span className="muted small">optional</span>
                </h3>
                <div className="form-grid">
                  <label>
                    Caregiver’s full name
                    <input
                      maxLength={100}
                      value={details.caregiverName}
                      onChange={(e) => detail("caregiverName", e.target.value)}
                      placeholder="e.g. Jamie Morgan"
                      required={Boolean(details.caregiverEmail)}
                    />
                  </label>
                  <label>
                    Caregiver’s email
                    <input
                      type="email"
                      maxLength={200}
                      value={details.caregiverEmail}
                      onChange={(e) => detail("caregiverEmail", e.target.value)}
                      placeholder="Their own sign-in and reminders"
                    />
                  </label>
                  <label>
                    Discharge nurse
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={details.nurseName}
                      onChange={(e) => detail("nurseName", e.target.value)}
                    />
                  </label>
                  <label>
                    Hospital contact number
                    <input
                      type="tel"
                      maxLength={40}
                      value={details.contactPhone}
                      onChange={(e) => detail("contactPhone", e.target.value)}
                      placeholder="Include country code"
                    />
                  </label>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div className="section-top">
                  <div>
                    <h3>Instructions, in your own words.</h3>
                    <p>
                      Type or dictate the instructions from the discharge
                      summary.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`button button-outline ${listening ? "recording" : ""}`}
                    onClick={dictate}
                  >
                    {listening ? <MicOff size={17} /> : <Mic size={17} />}
                    {listening ? "Stop recording" : "Use voice"}
                  </button>
                </div>
                <label className="sr-only" htmlFor="discharge-notes">
                  Discharge instructions
                </label>
                <textarea
                  id="discharge-notes"
                  className="discharge-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={20000}
                  minLength={10}
                  required
                  rows={12}
                  placeholder="Include prescribed medications, exact doses and times, starting supply, treatment dates, physiotherapy, wound care, follow-up details, and warning signs…"
                />
                <div className="notes-toolbar">
                  <button
                    type="button"
                    className="text-button"
                    onClick={template}
                  >
                    <FileText size={16} />
                    Insert structured template
                  </button>
                  <span>{notes.length.toLocaleString()} / 20,000</span>
                </div>
                <div className="info-strip">
                  <Sparkles size={19} />
                  <span>
                    {aiConfigured
                      ? "AI will organize these instructions into a draft. You’ll review every detail before sharing."
                      : "AI is not connected yet. Use the structured template to organize reminders, or add them manually in the next step. Free text is preserved as care notes."}
                  </span>
                </div>
                <p className="small muted">
                  Voice input uses your browser’s speech service and may send
                  audio to that provider. Use your hospital’s approved workflow.
                </p>
              </>
            )}
            {step === 2 && plan && (
              <>
                <div className="info-strip">
                  <ShieldCheck size={20} />
                  <span>
                    Review every medication, time, quantity, date, and
                    instruction against the discharge summary.
                  </span>
                </div>
                {clarifications.length > 0 && (
                  <div className="clarification-box">
                    <h3>A few things need your attention</h3>
                    <ul>
                      {clarifications.map((text, i) => (
                        <li key={i}>{text}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <PlanEditor
                  value={plan}
                  date={details.dischargeDate}
                  onChange={(next) => {
                    setPlan(next);
                    setReviewed(false);
                  }}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    required
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  <span>
                    I have checked this plan against the discharge summary,
                    resolved any missing details, and approve it for this
                    patient.
                  </span>
                </label>
              </>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button button-outline"
                disabled={busy || step === 0}
                onClick={() => {
                  setError("");
                  setStep(step - 1);
                }}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              {step === 1 && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => organize(true)}
                >
                  Enter plan manually
                </button>
              )}
              <button
                className="button"
                type="submit"
                disabled={busy || (step === 2 && !reviewed)}
              >
                {busy ? (
                  <Spinner />
                ) : step === 2 ? (
                  <ShieldCheck size={17} />
                ) : step === 1 ? (
                  <Sparkles size={17} />
                ) : null}
                {step === 0
                  ? "Continue"
                  : step === 1
                    ? busy
                      ? "Organizing instructions…"
                      : "Organize & review"
                    : busy
                      ? "Creating care plan…"
                      : "Approve & create access"}
                {step === 0 && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}
