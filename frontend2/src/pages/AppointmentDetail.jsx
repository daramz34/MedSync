import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Loader2, Lock } from "lucide-react";
import StatusBadge from "../components/appointments/StatusBadge";
import { EmptyState, ErrorBox, Panel, Skeleton } from "../components/dashboard/Panel";
import Modal from "../components/ui/Modal";
import IssuePrescriptionForm from "../components/prescriptions/IssuePrescriptionForm";
import {
  useAppointment, useAppointmentPrescription, useCancelAppointment, useUpdateAppointment,
} from "../hooks/useClinicData";
import { useAuthStore } from "../store/authStore";
import { formatDate, formatTime, pretty, roleOf } from "../utils/format";

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

function ActionBtn({ children, primary, danger, busy, disabled, onClick }) {
  const tone = primary
    ? "bg-primary text-white hover:bg-blue-700"
    : danger
      ? "border border-slate-300 hover:bg-red-50 hover:text-danger"
      : "border border-slate-300 hover:bg-slate-50";
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${tone}`}
    >
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = roleOf(useAuthStore((s) => s.user));
  const isDoctor = role === "doctor";
  const back = isDoctor ? "/doctor/appointments" : "/appointments";

  const appt = useAppointment(id);
  const rx = useAppointmentPrescription(id);
  const update = useUpdateAppointment();
  const cancel = useCancelAppointment();
  const [draft, setDraft] = useState(null);
  const [issueOpen, setIssueOpen] = useState(false);

  const a = appt.data;
  const status = String(a?.status || "").toLowerCase();
  const hasRx = Boolean(rx.data);
  const notes = draft ?? a?.notes ?? "";
  const notesChanged = draft !== null && draft !== (a?.notes ?? "");
  const busy = update.isPending || cancel.isPending;
  const error = update.error || cancel.error;

  const cancelAsPatient = async () => {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await cancel.mutateAsync(id);
      navigate(back);
    } catch {
      // error is shown below
    }
  };

  const setStatus = (s) => update.mutate({ id, status: s });

  return (
    <div className="space-y-5">
      <Link to={back} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy">
        <ArrowLeft size={16} /> Back to appointments
      </Link>

      {appt.isLoading ? (
        <Skeleton rows={3} />
      ) : appt.error ? (
        <ErrorBox
          message={appt.error.status === 404 ? "This appointment doesn't exist or isn't yours." : appt.error.message}
          onRetry={appt.refetch}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5">
            <Panel title="Appointment" action={<StatusBadge status={status} />}>
              <dl>
                <Row label="Patient">{a.patient?.full_name || "—"}</Row>
                <Row label="Doctor">
                  {a.doctor?.full_name || "—"}
                  {a.doctor?.specialization && (
                    <span className="block text-xs font-normal text-muted">{pretty(a.doctor.specialization)}</span>
                  )}
                </Row>
                <Row label="Date">{formatDate(a.appointment_date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Row>
                <Row label="Time">{formatTime(a.appointment_time)}</Row>
                <Row label="Reason">{a.reason}</Row>
              </dl>
            </Panel>

            <Panel title="Doctor's notes" description={isDoctor ? "Max 300 characters" : undefined}>
              {isDoctor ? (
                <>
                  <textarea
                    rows={4}
                    maxLength={300}
                    value={notes}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="e.g. Reviewed blood pressure, adjusted dosage."
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-200"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted">{notes.length}/300</span>
                    <button
                      disabled={!notesChanged || busy}
                      onClick={() => update.mutate({ id, notes }, { onSuccess: () => setDraft(null) })}
                      className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                    >
                      Save notes
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">{a.notes || "No notes from your doctor yet."}</p>
              )}
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="Actions">
              {status === "completed" || status === "cancelled" ? (
                <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-3 text-sm text-muted">
                  <Lock size={15} /> This visit is {status}, so its status can't change.
                </p>
              ) : isDoctor ? (
                <div className="space-y-2">
                  {status === "pending" && (
                    <>
                      <ActionBtn primary busy={busy} onClick={() => setStatus("confirmed")}>Confirm appointment</ActionBtn>
                      <ActionBtn danger busy={busy} onClick={() => setStatus("cancelled")}>Decline</ActionBtn>
                    </>
                  )}
                  {status === "confirmed" && (
                    <>
                      <ActionBtn primary busy={busy} disabled={!hasRx} onClick={() => setStatus("completed")}>
                        Mark as completed
                      </ActionBtn>
                      {!hasRx && (
                        <p className="text-xs text-muted">Issue a prescription first. A visit can only be completed once it has one.</p>
                      )}
                      <ActionBtn danger busy={busy} onClick={() => setStatus("cancelled")}>Cancel appointment</ActionBtn>
                    </>
                  )}
                </div>
              ) : (
                <ActionBtn danger busy={busy} onClick={cancelAsPatient}>Cancel appointment</ActionBtn>
              )}
              {error && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error.message}</p>
              )}
            </Panel>

            <Panel title="Prescription">
              {rx.isLoading ? (
                <Skeleton rows={1} />
              ) : rx.error ? (
                <ErrorBox message={rx.error.message} onRetry={rx.refetch} />
              ) : hasRx ? (
                <div>
                  <ul className="space-y-1.5">
                    {rx.data.items?.map((i) => (
                      <li key={i.id} className="text-sm">
                        <span className="font-semibold">{i.drug_name}</span>
                        <span className="text-muted"> · {i.dosage} · {pretty(i.frequency)} · {i.duration_days}d</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/prescriptions/${rx.data.id}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    <FileText size={15} /> Open prescription
                  </Link>
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No prescription yet"
                  body={
                    isDoctor
                      ? status === "confirmed"
                        ? "Issue a prescription for this visit. The patient gets a QR code for the pharmacy."
                        : "Confirm the visit first. Prescriptions are issued for confirmed visits."
                      : "If your doctor prescribes anything, it appears here with a QR code."
                  }
                  action={
                    isDoctor && status === "confirmed" ? (
                      <button
                        onClick={() => setIssueOpen(true)}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Issue prescription
                      </button>
                    ) : null
                  }
                />
              )}
            </Panel>
          </div>
        </div>
      )}

      <Modal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        wide
        title="Issue prescription"
        description="The patient receives a QR code for the pharmacy."
      >
        <IssuePrescriptionForm
          appointmentId={id}
          onCancel={() => setIssueOpen(false)}
          onDone={() => setIssueOpen(false)}
        />
      </Modal>
    </div>
  );
}