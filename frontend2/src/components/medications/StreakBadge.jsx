import { Flame } from "lucide-react";

export default function StreakBadge({ days = 0, className = "" }) {
  const hot = days > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        hot ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-muted"
      } ${className}`}
    >
      <Flame size={13} /> {days}-day streak
    </span>
  );
}