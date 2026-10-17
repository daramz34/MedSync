import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BellRing, Check, Loader2 } from "lucide-react";
import DayTracker from "../components/medications/DayTracker";
import StreakBadge from "../components/medications/StreakBadge";
import { ErrorBox, Panel, Skeleton } from "../components/dashboard/Panel";
import {
  useDeleteMedication, useLogMedication, useMedication, useMedicationLogs,
  useSetReminder, useStreak, useTestReminder, useTodayLogs, useUpdateMedication,
} from "../hooks/useClinicData";
import { courseProgress, dosesPerDay, formatDate, formatTime, pretty } from "../utils/format";
import RemindersPanel from "../components/medications/RemindersPanel";
function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export default function MedicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const med = useMedication(id);
  const logs = useMedicationLogs(id);
  const streak = useStreak(Number(id));
  const today = useTodayLogs();
  const log = useLogMedication();
  const update = useUpdateMedication();
  const setReminder = useSetReminder();
  const del = useDeleteMedication();
  const test = useTestReminder();
  const [time, setTime] = useState("");

  const m = med.data;
  const status = String(m?.status || "").toLowerCase();
  const s = streak.data;
  const course = m ? courseProgress(m) : null;

  const expected = dosesPerDay(m?.frequency);
  const todayLogs = (today.data || []).filter((l) => l.medication_id === Number(id));
  const takenToday = todayLogs.filter((l) => String(l.status).toLowerCase() === "taken").length;
  const doneToday = todayLogs.length >= expected;

  const error = log.error || update.error || del.error;

  const remove = async () => {
    if (!window.confirm("Delete this medication and its history?")) return;
    try {
      await del.mutateAsync(id);
      navigate("/medications");
    } catch {
      // error is shown below
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/medications" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy">
        <ArrowLeft size={16} /> Back to medications
      </Link>

      {med.isLoading ? (
        <Skeleton rows={3} />
      ) : med.error ? (
        <ErrorBox
          message={med.error.status === 404 ? "This medication doesn't exist or isn't yours." : med.error.message}
          onRetry={med.refetch}
        />
      ) : (
        <>
          <Panel
            title={m.drug_name}
            description={`${m.dosage} · ${pretty(m.frequency)} · ${m.duration_days} days from ${formatDate(m.start_date)}${
              status === "active" && course ? ` · ${course.label}` : ""
            }`}
            action={<StreakBadge days={s?.current_streak || 0} />}
          >
            <DayTracker startDate={m.start_date} durationDays={m.duration_days} logs={logs.data || []} />
          </Panel>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-5">
              <Panel title="Today" description={`Doses today ${takenToday}/${expected}`}>
                {status !== "active" ? (
                  <p className="text-sm text-muted">This medication is {status}.</p>
                ) : doneToday ? (
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Check size={16} className="text-accent" /> All doses logged for today
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <button
                      disabled={log.isPending}
                      onClick={() => log.mutate({ medication_id: Number(id), status: "taken" })}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {log.isPending && <Loader2 size={15} className="animate-spin" />} Mark taken
                    </button>
                    <button
                      disabled={log.isPending}
                      onClick={() => log.mutate({ medication_id: Number(id), status: "skipped" })}
                      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                    >
                      Skip dose
                    </button>
                  </div>
                )}
              </Panel>

              <Panel title="History">
                {logs.isLoading ? (
                  <Skeleton rows={2} />
                ) : (logs.data || []).length === 0 ? (
                  <p className="text-sm text-muted">No doses logged yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {[...logs.data]
                      .sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)))
                      .slice(0, 20)
                      .map((l) => (
                        <li key={l.id} className="flex items-center justify-between py-2.5 text-sm">
                          <span>
                            {formatDate(l.log_date)}
                            {l.taken_at && <span className="text-muted"> · {formatTime(l.taken_at)}</span>}
                          </span>
                          <span className="capitalize text-muted">{l.status}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </Panel>
            </div>

            <div className="space-y-5">
              <Panel title="Progress">
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Current" value={`${s?.current_streak ?? 0}d`} />
                  <Stat label="Longest" value={`${s?.longest_streak ?? 0}d`} />
                  <Stat label="Complete" value={`${Math.round(s?.completion_percentage ?? 0)}%`} />
                  <Stat label="Taken" value={s?.total_taken ?? 0} />
                  <Stat label="Missed" value={s?.total_missed ?? 0} />
                  <Stat label="Skipped" value={s?.total_skipped ?? 0} />
                </div>
              </Panel>

              <RemindersPanel
  key={`${m.id}-${m.reminder_enabled}-${(m.reminders || []).map((r) => r.time_of_day).join(",")}`}
  medication={m}
/>

              <Panel title="Manage">
                <div className="space-y-2">
                  {status === "active" && (
                    <>
                      <button
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id, status: "completed" })}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                      >
                        Mark course completed
                      </button>
                      <button
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id, status: "abandoned" })}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                      >
                        Stop taking this
                      </button>
                    </>
                  )}
                  <button
                    disabled={del.isPending}
                    onClick={remove}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-red-50 hover:text-danger disabled:opacity-60"
                  >
                    Delete medication
                  </button>
                </div>
                {error && (
                  <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                    {error.message}
                  </p>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}