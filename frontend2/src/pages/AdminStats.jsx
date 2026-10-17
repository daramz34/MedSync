import { Activity, CalendarCheck, Pill, Stethoscope, Users } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import { EmptyState, ErrorBox, Panel, Skeleton } from "../components/dashboard/Panel";
import { useAdminStats } from "../hooks/useClinicData";

const BARS = [
  { key: "pending_appointments", label: "Pending", color: "bg-warning" },
  { key: "confirmed_appointments", label: "Confirmed", color: "bg-primary" },
  { key: "completed_appointments", label: "Completed", color: "bg-accent" },
  { key: "cancelled_appointments", label: "Cancelled", color: "bg-danger" },
];

export default function AdminStats() {
  const stats = useAdminStats();
  const s = stats.data;
  const total = s?.total_appointments || 0;

  if (stats.error) return <ErrorBox message={stats.error.message} onRetry={stats.refetch} />;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Patients" icon={Users} loading={stats.isLoading} value={s?.total_patients ?? "—"} note="Registered" />
        <StatCard label="Doctors" icon={Stethoscope} tone="green" loading={stats.isLoading} value={s?.total_doctors ?? "—"} note="Clinicians" />
        <StatCard label="Today" icon={Activity} tone="amber" loading={stats.isLoading} value={s?.appointments_today ?? "—"} note="Appointments today" />
        <StatCard label="Active medications" icon={Pill} tone="orange" loading={stats.isLoading} value={s?.active_medications ?? "—"} note="Being tracked" />
      </section>

      <Panel title="Appointments by status" description={s ? `${total} in total` : undefined}>
        {stats.isLoading ? (
          <Skeleton rows={4} />
        ) : total === 0 ? (
          <EmptyState icon={CalendarCheck} title="No appointments yet" body="The breakdown appears once visits are booked." />
        ) : (
          <ul className="space-y-4">
            {BARS.map((b) => {
              const n = s[b.key] || 0;
              const pct = Math.round((n / total) * 100);
              return (
                <li key={b.key}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{b.label}</span>
                    <span className="text-muted">{n} · {pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${b.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}