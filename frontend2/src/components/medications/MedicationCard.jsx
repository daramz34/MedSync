import { Link } from "react-router-dom";
import { Check, ChevronRight, Loader2, Pill } from "lucide-react";
import StreakBadge from "./StreakBadge";
import { useLogMedication, useStreak } from "../../hooks/useClinicData";
import { courseProgress, dosesPerDay, formatTime, pretty } from "../../utils/format";

const statusTone = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-primary",
  abandoned: "bg-slate-100 text-muted",
};

// todayLogs = today's logs for THIS medication only
export default function MedicationCard({ medication: m, todayLogs = [] }) {
  const log = useLogMedication();
  const streak = useStreak(m.id);
  const status = String(m.status).toLowerCase();
  const expected = dosesPerDay(m.frequency);
  const taken = todayLogs.filter((l) => String(l.status).toLowerCase() === "taken").length;
  const done = todayLogs.length >= expected;
  const course = courseProgress(m);

  return (
    <li className="rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/medications/${m.id}`} className="flex items-center gap-4 p-4">
        <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl bg-green-100 text-accent sm:grid">
          <Pill size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-sm font-semibold">{m.drug_name}</p>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusTone[status] || statusTone.active}`}>
              {status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {m.dosage} · {pretty(m.frequency)}
            {m.reminder_enabled && m.reminder_time ? ` · Reminder ${formatTime(m.reminder_time)}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StreakBadge days={streak.data?.current_streak || 0} />
            {status === "active" && course && <span className="text-xs text-muted">{course.label}</span>}
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-slate-300" />
      </Link>

      {status === "active" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
          <span className="text-xs font-semibold text-muted">
            Doses today {taken}/{expected}
          </span>
          {done ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
              <Check size={14} /> All done today
            </span>
          ) : (
            <>
              <button
                disabled={log.isPending}
                onClick={() => log.mutate({ medication_id: m.id, status: "taken" })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {log.isPending && <Loader2 size={13} className="animate-spin" />} Mark taken
              </button>
              <button
                disabled={log.isPending}
                onClick={() => log.mutate({ medication_id: m.id, status: "skipped" })}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
              >
                Skip
              </button>
            </>
          )}
          {log.error && <span className="text-xs text-danger">{log.error.message}</span>}
        </div>
      )}
    </li>
  );
}