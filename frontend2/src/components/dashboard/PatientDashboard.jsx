import { Link } from "react-router-dom";
import { CalendarCheck, Check, FileText, Flame, Loader2, Pill, ShieldAlert } from "lucide-react";
import StatCard from "./StatCard";
import { EmptyState, ErrorBox, Panel, Skeleton } from "./Panel";
import StatusBadge from "../appointments/StatusBadge";
import {
  useAppointments, useLogDose, useMedications, usePrescriptions, useStreaks, useTodayLogs,
} from "../../hooks/useClinicData";
import { dosesPerDay, formatDate, formatTime, pretty, todayIso } from "../../utils/format";

export default function PatientDashboard({ user }) {
  const apps = useAppointments();
  const meds = useMedications({ status: "active" });
  const rx = usePrescriptions();
  const logs = useTodayLogs();
  const logDose = useLogDose();

  const activeMeds = meds.data || [];
  const streaks = useStreaks(activeMeds.slice(0, 6).map((m) => m.id));

  // Doses are counted per medication, using how many times a day it is prescribed
  const logsFor = (id) => (logs.data || []).filter((l) => l.medication_id === id);
  const takenOf = (id) =>
    logsFor(id).filter((l) => String(l.status).toLowerCase() === "taken").length;
  const expectedTotal = activeMeds.reduce((n, m) => n + dosesPerDay(m.frequency), 0);
  const takenCount = activeMeds.reduce(
    (n, m) => n + Math.min(takenOf(m.id), dosesPerDay(m.frequency)),
    0
  );

  const today = todayIso();
  const upcoming = (apps.data || [])
    .filter(
      (a) =>
        ["pending", "confirmed"].includes(String(a.status).toLowerCase()) &&
        String(a.appointment_date).slice(0, 10) >= today
    )
    .sort((a, b) =>
      `${a.appointment_date} ${a.appointment_time}`.localeCompare(`${b.appointment_date} ${b.appointment_time}`)
    );
  const next = upcoming[0];

  const bestStreak = Math.max(0, ...streaks.data.map((s) => s.current_streak || 0));
  const recentRx = (rx.data || []).slice(0, 3);

  return (
    <div className="space-y-6">
      {user?.is_verified === false && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">Your account hasn&rsquo;t been verified by the admin yet.</span>{" "}
            You can&rsquo;t book appointments until the clinic confirms your identity.
          </p>
        </div>
      )}

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Next visit"
          icon={CalendarCheck}
          loading={apps.isLoading}
          value={next ? formatDate(next.appointment_date, { day: "numeric", month: "short" }) : "—"}
          note={next ? `${formatTime(next.appointment_time)} · ${next.doctor?.full_name || "Doctor"}` : "Nothing booked"}
        />
        <StatCard
          label="Doses today"
          icon={Pill}
          tone="green"
          loading={meds.isLoading || logs.isLoading}
          value={`${takenCount}/${expectedTotal}`}
          note={activeMeds.length ? "Logged as taken" : "No active medication"}
        />
        <StatCard
          label="Best streak"
          icon={Flame}
          tone="orange"
          loading={meds.isLoading || streaks.loading}
          value={`${bestStreak}d`}
          note="Consecutive days"
        />
        <StatCard
          label="Prescriptions"
          icon={FileText}
          tone="amber"
          loading={rx.isLoading}
          value={(rx.data || []).length}
          note="On your account"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* Medications today */}
          <Panel
            title="Today's medication"
            description="Tap a dose once you've taken it"
            action={
              <Link to="/medications" className="text-sm font-semibold text-primary hover:underline">
                All →
              </Link>
            }
          >
            {meds.isLoading || logs.isLoading ? (
              <Skeleton rows={3} />
            ) : meds.error ? (
              <ErrorBox message={meds.error.message} onRetry={meds.refetch} />
            ) : activeMeds.length === 0 ? (
              <EmptyState
                icon={Pill}
                title="No active medication"
                body="Medication from your prescriptions appears here after you scan your QR code."
              />
            ) : (
              <ul>
                {activeMeds.map((m) => {
                  const expected = dosesPerDay(m.frequency);
                  const done = logsFor(m.id).length >= expected;
                  const pending = logDose.isPending && logDose.variables === m.id;
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{m.drug_name}</p>
                        <p className="text-xs text-muted">
                          {m.dosage} · {pretty(m.frequency)}
                          {m.reminder_time && ` · ${formatTime(m.reminder_time)}`}
                          {" · "}
                          {takenOf(m.id)}/{expected} today
                        </p>
                      </div>
                      {done ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                          <Check size={14} /> Done
                        </span>
                      ) : (
                        <button
                          onClick={() => logDose.mutate(m.id)}
                          disabled={pending}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          {pending && <Loader2 size={13} className="animate-spin" />}
                          Mark taken
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {logDose.error && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                {logDose.error.message}
              </p>
            )}
          </Panel>

          {/* Next appointment */}
          <Panel
            title="Next appointment"
            action={
              <Link to="/appointments" className="text-sm font-semibold text-primary hover:underline">
                Book / view →
              </Link>
            }
          >
            {apps.isLoading ? (
              <Skeleton rows={1} />
            ) : apps.error ? (
              <ErrorBox message={apps.error.message} onRetry={apps.refetch} />
            ) : next ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-primary">
                    <CalendarCheck size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {formatDate(next.appointment_date, { weekday: "long", day: "numeric", month: "long" })} ·{" "}
                      {formatTime(next.appointment_time)}
                    </p>
                    <p className="text-sm text-muted">
                      {next.doctor?.full_name || "Doctor"} · {next.reason}
                    </p>
                  </div>
                </div>
                <StatusBadge status={next.status} />
              </div>
            ) : (
              <EmptyState
                icon={CalendarCheck}
                title="No upcoming appointments"
                body="Request a visit and its status shows here: pending, confirmed, completed or cancelled."
                action={
                  <Link to="/appointments" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    Book appointment
                  </Link>
                }
              />
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          {/* Streaks */}
          <Panel title="Streaks" description="Current run per medication">
            {meds.isLoading || streaks.loading ? (
              <Skeleton rows={2} />
            ) : streaks.data.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-muted">
                Log a dose to start your first streak.
              </p>
            ) : (
              <ul className="space-y-3">
                {streaks.data.map((s) => {
                  const med = activeMeds.find((m) => m.id === s.medication_id);
                  const pct = Math.round(s.completion_percentage || 0);
                  return (
                    <li key={s.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">{med?.drug_name || `Medication ${s.medication_id}`}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-600">
                          <Flame size={12} /> {s.current_streak}d
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted">
                        {pct}% completion · longest {s.longest_streak}d
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* Recent prescriptions */}
          <Panel
            title="Recent prescriptions"
            action={
              <Link to="/prescriptions" className="text-sm font-semibold text-primary hover:underline">
                View all →
              </Link>
            }
          >
            {rx.isLoading ? (
              <Skeleton rows={2} />
            ) : rx.error ? (
              <ErrorBox message={rx.error.message} onRetry={rx.refetch} />
            ) : recentRx.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No prescriptions yet"
                body="After a visit, your doctor's prescription appears here with a QR code."
              />
            ) : (
              <ul className="space-y-3">
                {recentRx.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/prescriptions/${p.id}`}
                      className="block rounded-xl border border-slate-200 p-3.5 transition hover:border-primary hover:shadow-sm"
                    >
                      <p className="text-sm font-semibold">Prescription #{p.id}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {p.doctor?.full_name || "Doctor"} · {formatDate(p.created_at)}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        {(p.items || []).slice(0, 2).map((i) => i.drug_name).join(", ")}
                        {(p.items || []).length > 2 && ` +${p.items.length - 2} more`}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}