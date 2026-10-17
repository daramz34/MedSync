import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import AppointmentCard from "./AppointmentCard";
import { EmptyState, ErrorBox, Skeleton } from "../dashboard/Panel";

const TABS = ["all", "pending", "confirmed", "completed", "cancelled"];
const stamp = (a) => `${String(a.appointment_date).slice(0, 10)} ${String(a.appointment_time)}`;

export default function AppointmentList({ query, perspective, emptyAction }) {
  const [tab, setTab] = useState("all");
  const list = query.data || [];

  const counts = TABS.reduce((acc, t) => {
    acc[t] = t === "all" ? list.length : list.filter((a) => String(a.status).toLowerCase() === t).length;
    return acc;
  }, {});

  const shown = list
    .filter((a) => tab === "all" || String(a.status).toLowerCase() === tab)
    .sort((a, b) => stamp(b).localeCompare(stamp(a)));

  return (
    <div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition ${
              tab === t ? "bg-navy text-white" : "bg-white text-muted ring-1 ring-slate-200 hover:text-navy"
            }`}
          >
            {t} <span className="opacity-70">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {query.isLoading ? (
          <Skeleton rows={4} />
        ) : query.error ? (
          <ErrorBox message={query.error.message} onRetry={query.refetch} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={tab === "all" ? "No appointments yet" : `No ${tab} appointments`}
            body={
              perspective === "doctor"
                ? "When a patient books a visit with you, it appears here."
                : "Request a visit and track its status here."
            }
            action={tab === "all" ? emptyAction : null}
          />
        ) : (
          <ul className="space-y-3">
            {shown.map((a) => (
              <AppointmentCard key={a.id} appointment={a} perspective={perspective} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}