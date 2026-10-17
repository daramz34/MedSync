import { Link } from "react-router-dom";
import { Activity, CalendarCheck, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import StatCard from "./StatCard";
import { EmptyState, ErrorBox, Panel, Skeleton } from "./Panel";
import StatusBadge from "../appointments/StatusBadge";
import { useAppointments, useUpdateAppointment } from "../../hooks/useClinicData";
import { formatDate, formatTime, todayIso } from "../../utils/format";

const statusOf = (a) => String(a.status || "").toLowerCase();

export default function DoctorDashboard() {
  const apps = useAppointments();
  const update = useUpdateAppointment();
  const list = apps.data || [];
  const today = todayIso();

  const pending = list
    .filter((a) => statusOf(a) === "pending")
    .sort((a, b) =>
      `${a.appointment_date} ${a.appointment_time}`.localeCompare(`${b.appointment_date} ${b.appointment_time}`)
    );
  const completed = list.filter((a) => statusOf(a) === "completed").length;
  const todays = list
    .filter((a) => statusOf(a) === "confirmed" && String(a.appointment_date).slice(0, 10) === today)
    .sort((a, b) => String(a.appointment_time).localeCompare(String(b.appointment_time)));

  const busy = (id) => update.isPending && update.variables?.id === id;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Appointments" icon={CalendarCheck} loading={apps.isLoading} value={list.length} note="All time" />
        <StatCard label="Pending" icon={ClipboardList} tone="amber" loading={apps.isLoading} value={pending.length} note="Awaiting you" />
        <StatCard label="Today" icon={Activity} tone="green" loading={apps.isLoading} value={todays.length} note="Confirmed visits" />
        <StatCard label="Completed" icon={CheckCircle2} tone="blue" loading={apps.isLoading} value={completed} note="Finished visits" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Appointment requests"
          description="Confirm or decline new requests"
          action={
            <Link to="/doctor/appointments" className="text-sm font-semibold text-primary hover:underline">
              All →
            </Link>
          }
        >
          {apps.isLoading ? (
            <Skeleton rows={3} />
          ) : apps.error ? (
            <ErrorBox message={apps.error.message} onRetry={apps.refetch} />
          ) : pending.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No pending requests"
              body="When a patient books a visit with you, it appears here for confirmation."
            />
          ) : (
            <ul className="space-y-3">
              {pending.slice(0, 5).map((a) => (
                <li key={a.id} className="rounded-xl border border-slate-200 p-4 transition hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{a.patient?.full_name || "Patient"}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatDate(a.appointment_date)} · {formatTime(a.appointment_time)}
                      </p>
                      <p className="mt-1.5 text-sm text-muted">{a.reason}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={busy(a.id)}
                      onClick={() => update.mutate({ id: a.id, status: "confirmed" })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {busy(a.id) && <Loader2 size={13} className="animate-spin" />}
                      Confirm
                    </button>
                    <button
                      disabled={busy(a.id)}
                      onClick={() => update.mutate({ id: a.id, status: "cancelled" })}
                      className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold hover:bg-red-50 hover:text-danger disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {update.error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {update.error.message}
            </p>
          )}
        </Panel>

        <Panel title="Today's schedule" description="Your confirmed visits for today">
          {apps.isLoading ? (
            <Skeleton rows={2} />
          ) : todays.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Nothing scheduled" body="Confirmed visits for today appear here." />
          ) : (
            <ol>
              {todays.map((a) => (
                <li key={a.id} className="flex gap-4 border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
                  <span className="w-14 shrink-0 text-sm font-semibold text-primary">{formatTime(a.appointment_time)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{a.patient?.full_name || "Patient"}</span>
                    <span className="block truncate text-sm text-muted">{a.reason}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}