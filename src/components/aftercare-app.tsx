"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Home,
  ClipboardList,
  Pill,
  CalendarDays,
  Users,
  Sparkles,
  Bell,
  Smartphone,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  LogOut,
  ArrowLeft,
  Plus,
  Check,
  ShieldCheck,
  BellRing,
  BellOff,
  ArrowUpRight,
} from "lucide-react";
import type { CareRecord, Role, Task, Workspace } from "@/lib/types";
import { api, ApiError, initials } from "@/lib/client";
import {
  dateInZone,
  formatDate,
  formatTime,
  isComplete,
  tasksOnDate,
} from "@/lib/schedule";
import { Brand, EmptyState, Modal, Spinner } from "./ui";
import {
  Overview,
  CarePlan,
  Medications,
  Appointments,
  CareTeam,
  type Section,
} from "./patient-views";
import { CareAssistant } from "./assistant";
import { NurseWorkspace } from "./nurse-workspace";
import { NewDischarge } from "./new-discharge";
import { LoginScreen } from "./login";
import { usePwa } from "./use-pwa";

const navigation = [
  { section: "overview", label: "Overview", icon: Home },
  { section: "care", label: "My care plan", icon: ClipboardList },
  { section: "medications", label: "Medications", icon: Pill },
  { section: "appointments", label: "Appointments", icon: CalendarDays },
  { section: "team", label: "My care team", icon: Users },
] as const;
const headings: Record<Section, [string, string]> = {
  overview: ["", "Your next steps, a little clearer. We’re here with you."],
  care: [
    "Your care plan, made clearer.",
    "Small steps, guided by the people who care for you.",
  ],
  medications: [
    "A little clarity with every dose.",
    "Your prescribed medications, timings, and supply in one place.",
  ],
  appointments: [
    "Your next steps, together.",
    "A little preparation for the people looking after you.",
  ],
  team: [
    "The people in your corner.",
    "Recovery feels a little easier with the right support.",
  ],
  assistant: [
    "You don’t have to figure it out alone.",
    "A little guidance, grounded in your care plan.",
  ],
  patients: [
    "Care that continues beyond discharge.",
    "Give every patient a clear path to recovery.",
  ],
};

export function AftercareApp({
  allowDemo,
  loginOnly = false,
}: {
  allowDemo: boolean;
  loginOnly?: boolean;
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null),
    [loading, setLoading] = useState(true),
    [signedOut, setSignedOut] = useState(false),
    [section, setSection] = useState<Section>("overview"),
    [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState(false),
    [modal, setModal] = useState<
      "install" | "notifications" | "account" | null
    >(null),
    [newDischarge, setNewDischarge] = useState(false),
    [toast, setToast] = useState(""),
    [prompt, setPrompt] = useState<string | undefined>(),
    [notificationBusy, setNotificationBusy] = useState(false),
    [notificationsEnabled, setNotificationsEnabled] = useState(false),
    [notificationError, setNotificationError] = useState("");
  const pwa = usePwa();
  const load = useCallback(async () => {
    const value = await api<Workspace>("/api/workspace");
    setWorkspace(value);
    return value;
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const value = await api<Workspace>("/api/workspace");
        if (active) {
          setWorkspace(value);
          if (value.viewer.role === "nurse") setSection("patients");
        }
      } catch {
        if (allowDemo && !loginOnly) {
          try {
            await api("/api/auth/demo", { role: "patient" });
            const value = await api<Workspace>("/api/workspace");
            if (active) setWorkspace(value);
          } catch {
            if (active) setSignedOut(true);
          }
        } else if (active) setSignedOut(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [allowDemo, loginOnly]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  // Pull shared check-offs while the page is visible; no client database access is used.
  useEffect(() => {
    if (!workspace || signedOut) return;
    const refresh = () => {
      if (document.visibilityState === "visible")
        load().catch((error) => {
          if (
            error instanceof ApiError &&
            (error.status === 401 || error.status === 403)
          ) {
            setSignedOut(true);
            setWorkspace(null);
          }
        });
    };
    const interval = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [Boolean(workspace), signedOut, load]);
  useEffect(() => {
    if (workspace) {
      setSection(workspace.viewer.role === "nurse" ? "patients" : "overview");
      setSelectedId(null);
    }
  }, [workspace?.viewer.id]);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistration()
      .then((r) => r?.pushManager?.getSubscription())
      .then((sub) => setNotificationsEnabled(Boolean(sub)))
      .catch(() => {});
  }, [workspace?.viewer.id]);
  if (loading)
    return (
      <main className="app-loading">
        <Brand />
        <Spinner />
        <p>A little care is on its way…</p>
      </main>
    );
  async function onLogin() {
    const value = await load();
    setSignedOut(false);
    setSection(value.viewer.role === "nurse" ? "patients" : "overview");
    setSelectedId(null);
    if (window.location.pathname === "/login")
      window.history.replaceState(null, "", "/");
  }
  if (!workspace || signedOut)
    return <LoginScreen allowDemo={allowDemo} onLogin={onLogin} />;
  const { viewer } = workspace;
  const record =
    workspace.records.find((r) => r.id === selectedId) || workspace.records[0];
  const nurseHome = viewer.role === "nurse" && !selectedId;
  const today = dateInZone(new Date(), record?.timezone || "Asia/Kolkata");
  function navigate(next: Section, initial?: string) {
    setSection(next);
    setPrompt(initial);
    setSidebar(false);
  }
  async function roleChange(role: Role) {
    try {
      await pwa.disableNotifications();
      await api("/api/auth/demo", { role });
      const value = await load();
      setSection(role === "nurse" ? "patients" : "overview");
      setSelectedId(null);
      setModal(null);
      setNotificationsEnabled(false);
      if (!value.records.length)
        setToast("No care plans are linked to this account yet.");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function complete(task: Task) {
    if (!record) return;
    const value = await api<{ record: CareRecord }>(
      `/api/discharges/${record.id}/complete`,
      { taskId: task.id, date: today },
    );
    setWorkspace(
      (current) =>
        current && {
          ...current,
          records: current.records.map((r) =>
            r.id === value.record.id ? value.record : r,
          ),
        },
    );
    setToast(
      task.kind === "medication"
        ? "Dose recorded. Your care plan is up to date."
        : "One small step, recorded. You’re doing well.",
    );
  }
  async function signOut() {
    try {
      await pwa.disableNotifications().catch(() => {});
      await api("/api/auth/logout", {});
      setSignedOut(true);
      setWorkspace(null);
      setModal(null);
      setNotificationsEnabled(false);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function install() {
    setSidebar(false);
    try {
      if (pwa.canInstall) {
        const success = await pwa.install();
        if (success) setToast("After Care is ready to stay close.");
      } else setModal("install");
    } catch {
      setModal("install");
    }
  }
  async function toggleNotifications() {
    setNotificationBusy(true);
    setNotificationError("");
    try {
      if (notificationsEnabled) {
        await pwa.disableNotifications();
        setNotificationsEnabled(false);
      } else {
        await pwa.enableNotifications();
        setNotificationsEnabled(true);
      }
    } catch (e) {
      setNotificationError((e as Error).message);
    } finally {
      setNotificationBusy(false);
    }
  }
  const mainHeading = nurseHome
    ? headings.patients[0]
    : section === "overview"
      ? `One day at a time, ${record?.name.split(" ")[0] || "friend"}.`
      : headings[section][0];
  const pending = record
    ? tasksOnDate(record, today).filter((t) => !isComplete(record, t.id, today))
    : [];
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to your care plan
      </a>
      {sidebar && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setSidebar(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Main navigation">
          {viewer.role === "nurse" && (
            <button
              className={`nav-item ${nurseHome ? "active" : ""}`}
              onClick={() => {
                setSelectedId(null);
                setSection("patients");
                setSidebar(false);
              }}
            >
              <Users size={20} />
              My patients
            </button>
          )}
          {!nurseHome &&
            navigation.map(({ section: key, label, icon: Icon }) => (
              <button
                className={`nav-item ${section === key ? "active" : ""}`}
                key={key}
                onClick={() => navigate(key)}
              >
                <Icon size={20} />
                {viewer.role === "nurse" ? label.replace("My ", "") : label}
              </button>
            ))}
          {nurseHome && (
            <button
              className="nav-item"
              onClick={() => {
                setNewDischarge(true);
                setSidebar(false);
              }}
            >
              <ClipboardList size={20} />
              New discharge
            </button>
          )}
          <div className="nav-separator" />
          {!nurseHome && (
            <button
              className={`nav-item assistant-nav ${section === "assistant" ? "active" : ""}`}
              onClick={() => navigate("assistant")}
            >
              <Sparkles size={21} />
              Care assistant
            </button>
          )}
          {nurseHome && (
            <div className="nurse-nav-note">
              <ShieldCheck size={19} />
              <p>
                Thoughtful instructions.
                <br />
                Confident next steps.
              </p>
            </div>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="install-panel">
            <Smartphone size={26} />
            <div>
              <h3>
                {pwa.installed
                  ? "Your care, close at hand"
                  : "Get the aftercare app"}
              </h3>
              <p>
                {pwa.installed
                  ? "After Care is installed on this device."
                  : "Take your care plan with you everywhere."}
              </p>
              {!pwa.installed && (
                <button className="button button-outline" onClick={install}>
                  Install app
                </button>
              )}
            </div>
          </div>
          <button
            className="profile-button"
            onClick={() => setModal("account")}
          >
            <span className="avatar profile-avatar">
              {initials(viewer.name)}
            </span>
            <span>
              <strong>{viewer.name}</strong>
              <small>
                {viewer.role === "nurse"
                  ? "Discharge nurse"
                  : viewer.role === "caregiver"
                    ? "Caregiver"
                    : "Patient"}
              </small>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setSidebar(true)}
            >
              <Menu size={22} />
            </button>
            <span>Your recovery, together.</span>
          </div>
          <div className="topbar-actions">
            {viewer.demo && (
              <span className="demo-indicator">Demo workspace</span>
            )}
            {viewer.demo ? (
              <label className="role-switch">
                <span className="sr-only">Switch demo view</span>
                <select
                  value={viewer.role}
                  onChange={(e) => roleChange(e.target.value as Role)}
                >
                  <option value="patient">Patient view</option>
                  <option value="caregiver">Caregiver view</option>
                  <option value="nurse">Nurse view</option>
                </select>
                <ChevronDown size={14} />
              </label>
            ) : (
              <span className="viewer-label">
                {viewer.role === "nurse"
                  ? "Nurse workspace"
                  : viewer.role === "caregiver"
                    ? "Caregiver view"
                    : "Patient view"}
              </span>
            )}
            <button
              className="icon-button notification-button"
              aria-label="View reminders and notification settings"
              onClick={() => {
                setNotificationError("");
                setModal("notifications");
              }}
            >
              <Bell size={22} />
              {pending.length > 0 && <i />}
            </button>
          </div>
        </header>
        <main id="main" className="main-content">
          {viewer.role === "nurse" && selectedId && (
            <button
              className="text-button back-to-patients"
              onClick={() => {
                setSelectedId(null);
                setSection("patients");
              }}
            >
              <ArrowLeft size={16} />
              Back to my patients
            </button>
          )}
          <div className="page-heading">
            <div>
              <h1>{mainHeading}</h1>
              <p>
                {nurseHome ? headings.patients[1] : headings[section][1]}
                {viewer.role === "caregiver" && section === "overview"
                  ? ` Supporting ${record?.name}.`
                  : ""}
              </p>
            </div>
            <span className="page-date">
              {formatDate(today, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          {nurseHome ? (
            <NurseWorkspace
              records={workspace.records}
              onNew={() => setNewDischarge(true)}
              onSelect={(r) => {
                setSelectedId(r.id);
                setSection("overview");
              }}
            />
          ) : record ? (
            <>
              {section === "overview" && (
                <Overview
                  record={record}
                  today={today}
                  navigate={navigate}
                  onComplete={complete}
                  readonly={viewer.role === "nurse"}
                />
              )}
              {section === "care" && (
                <CarePlan
                  record={record}
                  today={today}
                  onComplete={complete}
                  readonly={viewer.role === "nurse"}
                />
              )}
              {section === "medications" && (
                <Medications
                  record={record}
                  today={today}
                  readonly={viewer.role === "nurse"}
                  onUpdate={(updated) =>
                    setWorkspace(
                      (current) =>
                        current && {
                          ...current,
                          records: current.records.map((r) =>
                            r.id === updated.id ? updated : r,
                          ),
                        },
                    )
                  }
                />
              )}
              {section === "appointments" && (
                <Appointments record={record} today={today} />
              )}
              {section === "team" && <CareTeam record={record} />}
              {section === "assistant" && (
                <CareAssistant
                  key={`${record.id}:${prompt || ""}`}
                  record={record}
                  initialPrompt={prompt}
                  configured={workspace.aiConfigured}
                />
              )}
            </>
          ) : (
            <section className="panel">
              <EmptyState
                icon={<ClipboardList size={30} />}
                title="Your care plan is on its way"
              >
                Your hospital will link your discharge plan to this account.
                Contact your discharge team for help.
              </EmptyState>
            </section>
          )}
          <footer className="main-footer">
            <span>
              <ShieldCheck size={14} />
              Care that stays with you.
            </span>
            <span>
              aftercare<span className="footer-dot">.</span>
            </span>
          </footer>
        </main>
      </div>
      {newDischarge && viewer.role === "nurse" && (
        <NewDischarge
          viewer={viewer}
          aiConfigured={workspace.aiConfigured}
          onClose={() => setNewDischarge(false)}
          onCreated={(r) =>
            setWorkspace(
              (current) =>
                current && { ...current, records: [r, ...current.records] },
            )
          }
        />
      )}
      {modal === "install" && (
        <Modal
          title="A little care, wherever you are."
          onClose={() => setModal(null)}
        >
          <div className="install-modal-art">
            <Smartphone size={48} />
          </div>
          <p>Install After Care to open your plan from your home screen.</p>
          <div className="install-instructions">
            <h3>On iPhone or iPad</h3>
            <p>
              Open this link in Safari, tap <strong>Share</strong>, then{" "}
              <strong>Add to Home Screen</strong>.
            </p>
            <h3>On Android or desktop</h3>
            <p>
              Open the browser menu and choose <strong>Install app</strong> or{" "}
              <strong>Add to Home screen</strong>.
            </p>
          </div>
          <p className="small muted">
            Installation and notifications need HTTPS, or localhost during
            development. Sign in with your hospital-issued credentials after
            installation.
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setModal(null)}>
              Got it
              <Check size={16} />
            </button>
          </div>
        </Modal>
      )}
      {modal === "account" && (
        <Modal title="Your After Care account" onClose={() => setModal(null)}>
          <div className="account-person">
            <span className="avatar profile-avatar">
              {initials(viewer.name)}
            </span>
            <div>
              <h3>{viewer.name}</h3>
              <p>
                {viewer.role === "nurse"
                  ? "Discharge nurse"
                  : viewer.role === "caregiver"
                    ? "Caregiver"
                    : "Patient"}
                {viewer.demo && " · Local demo account"}
              </p>
            </div>
          </div>
          {viewer.demo && (
            <div className="info-strip">
              <ShieldCheck size={20} />
              <span>
                This workspace uses fictional demo data, stored on the local
                server. Use it to explore the experience before connecting your
                hospital.
              </span>
            </div>
          )}
          <button
            className="account-action"
            onClick={() => {
              setNotificationError("");
              setModal("notifications");
            }}
          >
            <BellRing size={19} />
            Reminder settings
            <ChevronRight size={17} />
          </button>
          <button className="account-action" onClick={install}>
            <Smartphone size={19} />
            Install After Care
            <ArrowUpRight size={17} />
          </button>
          <button className="account-action danger" onClick={signOut}>
            <LogOut size={19} />
            Sign out
            <ChevronRight size={17} />
          </button>
        </Modal>
      )}
      {modal === "notifications" && (
        <Modal
          title="A gentle nudge, right on time."
          onClose={() => setModal(null)}
        >
          <p>
            Keep medications, movement, and follow-ups a little easier to
            remember.
          </p>
          <div className="notification-setting">
            <span className="icon-tile">
              {notificationsEnabled ? (
                <BellRing size={23} />
              ) : (
                <BellOff size={23} />
              )}
            </span>
            <div>
              <h3>Care reminders</h3>
              <p>
                {notificationsEnabled
                  ? "Notifications are enabled on this device."
                  : workspace.pushConfigured && !viewer.demo
                    ? "Enable background notifications on this device."
                    : "Setup pending · In-app reminders are available below."}
              </p>
            </div>
            <button
              className="button button-small button-outline"
              onClick={toggleNotifications}
              disabled={notificationBusy}
            >
              {notificationBusy ? (
                <Spinner />
              ) : notificationsEnabled ? (
                "Disable"
              ) : (
                "Enable"
              )}
            </button>
          </div>
          {notificationError && (
            <p className="error-message" role="alert">
              {notificationError}
            </p>
          )}
          <p className="small muted">
            Each patient and caregiver enables notifications on their own
            device. Background reminders need Web Push configuration and a
            scheduled server job.
          </p>
          {record && (
            <>
              <h3 className="form-section-title">
                Still ahead in your care plan
              </h3>
              <div className="reminder-list">
                {pending.length ? (
                  pending.map((t) => (
                    <div key={t.id}>
                      <span className="reminder-dot" />
                      <div>
                        <strong>{t.title}</strong>
                        <p>
                          {formatTime(t.time)} · {t.instructions}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    All of today’s tasks have been checked off.
                  </p>
                )}
              </div>
            </>
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
