"use client";
import { useState } from "react";
import {
  Check,
  Pill,
  Footprints,
  HeartPulse,
  ClipboardCheck,
  CalendarDays,
} from "lucide-react";
import type { CareRecord, Task } from "@/lib/types";
import {
  addDays,
  formatDate,
  formatTime,
  isComplete,
  tasksOnDate,
} from "@/lib/schedule";
import { ArrowLink, EmptyState, Modal, Spinner } from "./ui";

export function TaskIcon({
  kind,
  size = 18,
}: {
  kind: Task["kind"];
  size?: number;
}) {
  const Icon =
    kind === "medication"
      ? Pill
      : kind === "movement"
        ? Footprints
        : kind === "care"
          ? ClipboardCheck
          : HeartPulse;
  return <Icon size={size} />;
}
export function Schedule({
  record,
  today,
  onComplete,
  onFull,
  expanded = false,
  readonly = false,
}: {
  record: CareRecord;
  today: string;
  onComplete: (task: Task) => Promise<void>;
  onFull?: () => void;
  expanded?: boolean;
  readonly?: boolean;
}) {
  const [tab, setTab] = useState<"today" | "upcoming">("today"),
    [confirm, setConfirm] = useState<Task | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const days =
    tab === "today" ? [today] : [1, 2, 3].map((i) => addDays(today, i));
  async function complete(task: Task) {
    setBusy(true);
    setError("");
    try {
      await onComplete(task);
      setConfirm(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`panel schedule-panel ${expanded ? "expanded-schedule" : ""}`}
    >
      <div className="section-top">
        <div>
          <h2>Your day, at a glance</h2>
          <p>A simple plan for a little more peace of mind.</p>
        </div>
        {onFull && <ArrowLink onClick={onFull}>View full schedule</ArrowLink>}
      </div>
      <div className="tabs" role="tablist" aria-label="Schedule">
        <button
          role="tab"
          aria-selected={tab === "today"}
          className={tab === "today" ? "active" : ""}
          onClick={() => setTab("today")}
        >
          Today
        </button>
        <button
          role="tab"
          aria-selected={tab === "upcoming"}
          className={tab === "upcoming" ? "active" : ""}
          onClick={() => setTab("upcoming")}
        >
          Upcoming
        </button>
        <span className="tab-note">{record.timezone.replace("_", " ")}</span>
      </div>
      <div role="tabpanel">
        {days.map((date) => {
          const tasks = tasksOnDate(record, date);
          const visible =
            expanded || tab === "upcoming" ? tasks : tasks.slice(0, 4);
          return (
            <div key={date}>
              {tab === "upcoming" && (
                <h3 className="schedule-day">
                  {formatDate(date, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h3>
              )}
              {tasks.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays size={24} />}
                  title="A little breathing room"
                >
                  No tasks are scheduled for{" "}
                  {date === today ? "today" : "this day"}.
                </EmptyState>
              ) : (
                <div className="timeline">
                  {visible.map((task) => {
                    const done = isComplete(record, task.id, date);
                    return (
                      <div
                        className={`task-row ${done ? "task-done" : ""}`}
                        key={`${date}:${task.id}`}
                      >
                        <time>{formatTime(task.time)}</time>
                        <span
                          className={`timeline-dot ${done ? "complete" : ""}`}
                        >
                          {done && <Check size={14} strokeWidth={2.8} />}
                        </span>
                        <div className="task-copy">
                          <h3>{task.title}</h3>
                          <p>{task.instructions}</p>
                        </div>
                        <div className="task-action">
                          {done ? (
                            <span className="done-label">
                              <Check size={16} />
                              {task.kind === "medication" ? "Taken" : "Done"}
                            </span>
                          ) : date === today && !readonly ? (
                            <button
                              className={`button button-small ${task.kind !== "medication" ? "button-quiet" : ""}`}
                              onClick={() => {
                                setError("");
                                setConfirm(task);
                              }}
                            >
                              {task.kind === "medication"
                                ? "Mark as taken"
                                : "Mark as done"}
                            </button>
                          ) : (
                            <span className="scheduled-label">Scheduled</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {confirm && (
        <Modal
          title={
            confirm.kind === "medication"
              ? "Have you taken this dose?"
              : "Have you completed this task?"
          }
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <div className="confirmation-task">
            <span className="icon-tile">
              <TaskIcon kind={confirm.kind} size={23} />
            </span>
            <div>
              <h3>{confirm.title}</h3>
              <p>
                {formatTime(confirm.time)} · {formatDate(today)}
              </p>
            </div>
          </div>
          <p>{confirm.instructions}</p>
          <p className="muted small">
            This check-off is shared with your caregiver. Only confirm after you
            have completed the task.
          </p>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="button button-outline"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Not yet
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => complete(confirm)}
            >
              {busy ? <Spinner /> : <Check size={17} />}Confirm{" "}
              {confirm.kind === "medication" ? "taken" : "completed"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
