"use client";
import { useState } from "react";
import {
  ArrowRight,
  Search,
  Plus,
  Users,
  ClipboardCheck,
  CalendarDays,
  ChevronRight,
  FileText,
} from "lucide-react";
import type { CareRecord } from "@/lib/types";
import { initials } from "@/lib/client";
import {
  dateInZone,
  dayNumber,
  formatDate,
  isComplete,
  tasksOnDate,
} from "@/lib/schedule";
import { EmptyState } from "./ui";
export function NurseWorkspace({
  records,
  onNew,
  onSelect,
}: {
  records: CareRecord[];
  onNew: () => void;
  onSelect: (record: CareRecord) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = records.filter((r) =>
    `${r.name} ${r.email} ${r.diagnosis}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const withCaregivers = records.filter((r) => r.caregiverUserId).length;
  const followups = records.reduce(
    (count, r) =>
      count +
      r.plan.appointments.filter(
        (a) => a.date >= dateInZone(new Date(), r.timezone),
      ).length,
    0,
  );
  return (
    <>
      <section className="recovery-banner nurse-banner">
        <div>
          <h2>A good recovery starts with a clear plan.</h2>
          <p>
            Turn your discharge instructions into everyday support for your
            patients.
          </p>
          <button className="button" onClick={onNew}>
            <Plus size={17} />
            New discharge
          </button>
        </div>
      </section>
      <div className="stats-grid nurse-stats">
        <div className="stat-panel">
          <span className="icon-tile">
            <Users size={24} />
          </span>
          <div>
            <p>Patients in your care</p>
            <h3 className="stat-value">{records.length}</h3>
          </div>
        </div>
        <div className="stat-panel">
          <span className="icon-tile blue">
            <ClipboardCheck size={24} />
          </span>
          <div>
            <p>Connected caregivers</p>
            <h3 className="stat-value">{withCaregivers}</h3>
          </div>
        </div>
        <div className="stat-panel">
          <span className="icon-tile blue">
            <CalendarDays size={24} />
          </span>
          <div>
            <p>Upcoming follow-ups</p>
            <h3 className="stat-value">{followups}</h3>
          </div>
        </div>
      </div>
      <section className="panel patients-panel">
        <div className="section-top">
          <div>
            <h2>A little care beyond discharge.</h2>
            <p>Every patient’s next steps, in one place.</p>
          </div>
          <button className="button button-outline" onClick={onNew}>
            <Plus size={16} />
            New discharge
          </button>
        </div>
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Search patients"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or procedure…"
          />
          <span>
            {filtered.length} {filtered.length === 1 ? "patient" : "patients"}
          </span>
        </label>
        <div className="patients-table-wrap">
          <table className="patients-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Recovery</th>
                <th>Today’s progress</th>
                <th>Caregiver</th>
                <th>
                  <span className="sr-only">View patient</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const date = dateInZone(new Date(), r.timezone),
                  tasks = tasksOnDate(r, date),
                  done = tasks.filter((t) => isComplete(r, t.id, date)).length;
                return (
                  <tr key={r.id} onClick={() => onSelect(r)}>
                    <td>
                      <div className="table-person">
                        <span className="avatar sage">{initials(r.name)}</span>
                        <div>
                          <strong>{r.name}</strong>
                          <small>{r.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{r.diagnosis}</strong>
                      <small>
                        Day {dayNumber(r, date)} · Discharged{" "}
                        {formatDate(r.dischargeDate)}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {done} of {tasks.length} complete
                      </strong>
                      <div className="progress-track">
                        <span
                          style={{
                            width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      {r.caregiverName || (
                        <span className="muted">Not assigned</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`View ${r.name}’s care plan`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(r);
                        }}
                      >
                        <ChevronRight size={19} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <EmptyState
            icon={<FileText size={28} />}
            title={
              search
                ? "No matching patients"
                : "A fresh start for your patients"
            }
          >
            {search
              ? "Try another name or procedure."
              : "Create your first discharge plan to get started."}
          </EmptyState>
        )}
        <div className="table-footer">
          <span>Care plans are shared only after your review.</span>
          <button className="text-button" onClick={onNew}>
            Create a care plan
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </>
  );
}
