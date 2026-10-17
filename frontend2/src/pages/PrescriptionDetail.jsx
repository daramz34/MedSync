import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, CalendarCheck, Loader2 } from "lucide-react";
import QRDisplay, { QrBadge, qrState } from "../components/prescriptions/QRDisplay";
import { ErrorBox, Panel, Skeleton } from "../components/dashboard/Panel";
import { usePrescription, useRevokeQr } from "../hooks/useClinicData";
import { useAuthStore } from "../store/authStore";
import { formatDate, pretty, roleOf } from "../utils/format";

export default function PrescriptionDetail() {
  const { id } = useParams();
  const isDoctor = roleOf(useAuthStore((s) => s.user)) === "doctor";
  const back = isDoctor ? "/doctor/prescriptions" : "/prescriptions";
  const rx = usePrescription(id);
  const revoke = useRevokeQr();
  const p = rx.data;

  const onRevoke = () => {
    if (window.confirm("Revoke this QR code? The pharmacy will no longer be able to scan it.")) revoke.mutate(id);
  };

  return (
    <div className="space-y-5">
      <Link to={back} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy">
        <ArrowLeft size={16} /> Back to prescriptions
      </Link>

      {rx.isLoading ? (
        <Skeleton rows={3} />
      ) : rx.error ? (
        <ErrorBox
          message={rx.error.status === 404 ? "This prescription doesn't exist or isn't yours." : rx.error.message}
          onRetry={rx.refetch}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            <Panel
              title={`Prescription #${p.id}`}
              description={`Issued ${formatDate(p.created_at)}`}
              action={<QrBadge prescription={p} />}
            >
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Patient</dt>
                  <dd className="font-medium">{p.patient?.full_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Doctor</dt>
                  <dd className="font-medium">
                    {p.doctor?.full_name || "—"}
                    {p.doctor?.specialization && <span className="block text-xs font-normal text-muted">{pretty(p.doctor.specialization)}</span>}
                  </dd>
                </div>
              </dl>
              <Link
                to={`/appointments/${p.appointment_id}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <CalendarCheck size={15} /> View appointment
              </Link>
            </Panel>

            <Panel title="Medicines">
              <ul className="divide-y divide-slate-100">
                {(p.items || []).map((i) => (
                  <li key={i.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-semibold">{i.drug_name}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {i.dosage} · {pretty(i.frequency)} · {i.duration_days} day{i.duration_days === 1 ? "" : "s"}
                    </p>
                    {i.instructions && <p className="mt-1 text-xs text-muted">{i.instructions}</p>}
                  </li>
                ))}
              </ul>
            </Panel>

            {p.notes && (
              <Panel title="Doctor's notes">
                <p className="whitespace-pre-line text-sm text-muted">{p.notes}</p>
              </Panel>
            )}
          </div>

          <div className="space-y-5">
            <Panel title="Pharmacy QR code" description="Show this at the pharmacy">
              <QRDisplay prescription={p} />
            </Panel>

            {isDoctor && qrState(p) === "active" && (
              <Panel title="Doctor actions">
                <button
                  onClick={onRevoke}
                  disabled={revoke.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-red-50 hover:text-danger disabled:opacity-50"
                >
                  {revoke.isPending ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                  Revoke QR code
                </button>
                {revoke.error && (
                  <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{revoke.error.message}</p>
                )}
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}