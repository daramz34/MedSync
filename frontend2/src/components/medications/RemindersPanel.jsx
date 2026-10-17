import { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { Panel } from "../dashboard/Panel";
import { useSaveReminders, useTestReminder } from "../../hooks/useClinicData";

const SLOTS = {
  once_daily: [{ label: "Daily", def: "08:00" }],
  weekly: [{ label: "Weekly", def: "08:00" }],
  twice_daily: [{ label: "Morning", def: "08:00" }, { label: "Evening", def: "20:00" }],
  three_times_daily: [
    { label: "Morning", def: "08:00" },
    { label: "Afternoon", def: "14:00" },
    { label: "Evening", def: "20:00" },
  ],
};

const hhmm = (v) => String(v || "").slice(0, 5);

function initialTimes(m, slots) {
  const saved = [...(m.reminders || [])].sort((a, b) =>
    String(a.time_of_day).localeCompare(String(b.time_of_day))
  );
  return slots.map((s, i) =>
    saved[i] ? hhmm(saved[i].time_of_day) : i === 0 && m.reminder_time ? hhmm(m.reminder_time) : ""
  );
}

export default function RemindersPanel({ medication: m }) {
  const slots = SLOTS[String(m.frequency).toLowerCase()] || SLOTS.once_daily;
  const save = useSaveReminders();
  const test = useTestReminder();

  const [times, setTimes] = useState(() => initialTimes(m, slots));
  const [enabled, setEnabled] = useState(!!m.reminder_enabled);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const setAt = (i, v) => {
    setTimes((t) => t.map((x, idx) => (idx === i ? v : x)));
    setSaved(false);
  };

  const onSave = () => {
    setError("");
    const filled = times.map((t, i) => ({ t, i })).filter((x) => x.t);
    if (enabled && filled.length === 0) return setError("Set at least one reminder time, or turn reminders off.");
    if (new Set(filled.map((x) => x.t)).size !== filled.length) return setError("Each reminder needs a different time.");

    save.mutate(
      {
        id: m.id,
        enabled,
        times: filled.map(({ t, i }) => ({ time_of_day: t, label: slots[i].label, enabled: true })),
      },
      { onSuccess: () => setSaved(true), onError: (e) => setError(e.message) }
    );
  };

  return (
    <Panel
      title="Reminders"
      description={`${slots.length} dose${slots.length > 1 ? "s" : ""} a day, so ${slots.length} reminder time${slots.length > 1 ? "s" : ""}`}
    >
      <div className="space-y-3">
        {slots.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <label htmlFor={`rem-${i}`} className="w-24 shrink-0 text-sm font-medium">{s.label}</label>
            <input
              id={`rem-${i}`}
              type="time"
              value={times[i]}
              onChange={(e) => setAt(i, e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-200"
            />
          </div>
        ))}
      </div>

      <label className="mt-4 flex items-center justify-between text-sm font-medium">
        <span>Send reminders {enabled ? "(on)" : "(off)"}</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => { setEnabled(e.target.checked); setSaved(false); }}
          className="h-4 w-4 accent-[#2563eb]"
        />
      </label>

      <button
        onClick={onSave}
        disabled={save.isPending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {save.isPending && <Loader2 size={15} className="animate-spin" />} Save reminders
      </button>

      {saved && <p role="status" className="mt-2 text-xs text-green-700">Reminders saved.</p>}
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

      <button
        onClick={() => test.mutate(m.id)}
        disabled={test.isPending}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline disabled:opacity-60"
      >
        <BellRing size={15} /> Send a test reminder
      </button>
      {test.isSuccess && <p className="mt-2 text-xs text-green-700">Test reminder sent.</p>}
      {test.error && <p className="mt-2 text-xs text-danger">{test.error.message}</p>}
    </Panel>
  );
}