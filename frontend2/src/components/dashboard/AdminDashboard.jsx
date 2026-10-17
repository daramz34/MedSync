import { Link } from "react-router-dom";
import { Activity, CalendarCheck, Loader2, Pill, ShieldCheck, Stethoscope, Users } from "lucide-react";
import StatCard from "./StatCard";
import { EmptyState, ErrorBox, Panel, Skeleton } from "./Panel";
import { useAdminStats, usePendingUsers, useVerifyUser } from "../../hooks/useClinicData";
import { formatDate } from "../../utils/format";

const BARS = [
  { key: "pending_appointments", label: "Pending", color: "bg-warning" },
  { key: "confirmed_appointments", label: "Confirmed", color: "bg-primary" },
  { key: "completed_appointments", label: "Completed", color: "bg-accent" },
  { key: "cancelled_appointments", label: "Cancelled", color: "bg-danger" },
];

export default function AdminDashboard() {
  const stats = useAdminStats();
  const pending = usePendingUsers();
  const verify = useVerifyUser();
  const s = stats.data;
  const total = s?.total_appointments || 0;

  return (
    <div className="space-y-6">
      {stats.error && <ErrorBox message={stats.error.message} onRetry={stats.refetch} />}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Patients" icon={Users} loading={stats.isLoading} value={s?.total_patients ?? "—"} note="Registered" />
        <StatCard label="Doctors" icon={Stethoscope} tone="green" loading={stats.isLoading} value={s?.total_doctors ?? "—"} note="Active clinicians" />
        <StatCard label="Appointments" icon={CalendarCheck} tone="amber" loading={stats.isLoading} value={s?.total_appointments ?? "—"} note={s ? `${s.appointments_today} today` : ""} />
        <StatCard label="Active medications" icon={Pill} tone="orange" loading={stats.isLoading} value={s?.active_medications ?? "—"} note="Being tracked" />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Appointments by status" description="Clinic-wide breakdown">
          {stats.isLoading ? (
            <Skeleton rows={4} />
          ) : !s ? null : total === 0 ? (
            <EmptyState icon={Activity} title="No appointments yet" body="Status breakdown appears once visits are booked." />
          ) : (
            <ul className="space-y-4">
              {BARS.map((b) => {
                const n = s[b.key] || 0;
                return (
                  <li key={b.key}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{b.label}</span>
                      <span className="text-muted">{n}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${b.color} transition-all duration-700`}
                        style={{ width: `${(n / total) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Pending verification"
          description="Patients awaiting an identity check"
          action={
            <Link to="/admin/users" className="text-sm font-semibold text-primary hover:underline">
              Users →
            </Link>
          }
        >
          {pending.isLoading ? (
            <Skeleton rows={3} />
          ) : pending.error ? (
            <ErrorBox message={pending.error.message} onRetry={pending.refetch} />
          ) : (pending.data || []).length === 0 ? (
            <EmptyState icon={ShieldCheck} title="All caught up" body="No patients are waiting for verification." />
          ) : (
            <ul>
              {pending.data.slice(0, 5).map((u) => {
                const busy = verify.isPending && verify.variables === u.id;
                return (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{u.full_name}</p>
                      <p className="truncate text-xs text-muted">
                        {u.email} · {formatDate(u.created_at)}
                      </p>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() => verify.mutate(u.id)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {busy && <Loader2 size={13} className="animate-spin" />}
                      Verify
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {verify.error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {verify.error.message}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}