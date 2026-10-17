import { Link } from "react-router-dom";
import { CalendarCheck, ChevronRight, Loader2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { useUpdateAppointment } from "../../hooks/useClinicData";
import { formatDate, formatTime, pretty } from "../../utils/format";

export default function AppointmentCard({ appointment: a, perspective = "patient" }) {
  const update = useUpdateAppointment();
  const isDoctor = perspective === "doctor";
  const other = isDoctor ? a.patient : a.doctor;
  const status = String(a.status).toLowerCase();
  const showActions = isDoctor && status === "pending";

  return (
    <li className="rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/appointments/${a.id}`} className="flex items-center gap-4 p-4">
        <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-100 text-primary sm:grid">
          <CalendarCheck size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-sm font-semibold">
              {other?.full_name || (isDoctor ? "Patient" : "Doctor")}
              {!isDoctor && other?.specialization && (
                <span className="font-normal text-muted"> · {pretty(other.specialization)}</span>
              )}
            </p>
            <StatusBadge status={status} />
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {formatDate(a.appointment_date)} · {formatTime(a.appointment_time)}
          </p>
          <p className="mt-1.5 truncate text-sm text-muted">{a.reason}</p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-slate-300" />
      </Link>

      {showActions && (
        <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
          <button
            disabled={update.isPending}
            onClick={() => update.mutate({ id: a.id, status: "confirmed" })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {update.isPending && <Loader2 size={13} className="animate-spin" />}
            Confirm
          </button>
          <button
            disabled={update.isPending}
            onClick={() => update.mutate({ id: a.id, status: "cancelled" })}
            className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold hover:bg-red-50 hover:text-danger disabled:opacity-60"
          >
            Decline
          </button>
          {update.error && <span className="self-center text-xs text-danger">{update.error.message}</span>}
        </div>
      )}
    </li>
  );
}