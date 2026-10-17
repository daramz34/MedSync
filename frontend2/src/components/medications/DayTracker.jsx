import { motion } from "framer-motion";
import { Check, Minus, X } from "lucide-react";
import { todayIso } from "../../utils/format";

function dayIso(start, offset) {
  const [y, m, d] = String(start).slice(0, 10).split("-").map(Number);
  return todayIso(new Date(y, m - 1, d + offset));
}

export default function DayTracker({ startDate, durationDays, logs = [] }) {
  const today = todayIso();
  const byDate = new Map(logs.map((l) => [String(l.log_date).slice(0, 10), String(l.status).toLowerCase()]));
  const total = Math.min(durationDays || 0, 60);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {Array.from({ length: total }, (_, i) => {
        const date = dayIso(startDate, i);
        const log = byDate.get(date);
        const isToday = date === today;
        const future = date > today;

        let tone = "border-dashed border-slate-300 text-slate-400";
        let icon = <span className="text-xl leading-none">·</span>;
        let label = future ? "upcoming" : isToday ? "today" : "no log";

        if (log === "taken") { tone = "border-accent bg-accent text-white"; icon = <Check size={20} />; label = "recorded"; }
        else if (log === "missed") { tone = "border-danger bg-red-50 text-danger"; icon = <X size={20} />; label = "missed"; }
        else if (log === "skipped") { tone = "border-slate-300 bg-slate-100 text-muted"; icon = <Minus size={20} />; label = "skipped"; }
        else if (!future && !isToday) { tone = "border-red-200 bg-red-50/50 text-red-300"; }

        return (
          <motion.div
            key={date}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: Math.min(i, 10) * 0.04, type: "spring", stiffness: 320 }}
            className="flex min-w-[64px] flex-col items-center gap-1.5"
          >
            <div className={`grid h-12 w-12 place-items-center rounded-full border-2 ${tone} ${isToday ? "ring-2 ring-primary ring-offset-2" : ""}`}>
              {icon}
            </div>
            <p className="text-xs font-semibold">Day {i + 1}</p>
            <p className="text-[11px] text-muted">{label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}