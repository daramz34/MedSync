import { useState } from "react";
import { CheckCircle2, FileText, Plus } from "lucide-react";
import PrescriptionCard from "../components/prescriptions/PrescriptionCard";
import IssuePrescriptionForm from "../components/prescriptions/IssuePrescriptionForm";
import Modal from "../components/ui/Modal";
import { EmptyState, ErrorBox, Skeleton } from "../components/dashboard/Panel";
import { useAppointments, usePrescriptions } from "../hooks/useClinicData";
import { useAuthStore } from "../store/authStore";
import { formatDate, formatTime, roleOf } from "../utils/format";

export default function Prescriptions() {
  const isDoctor = roleOf(useAuthStore((s) => s.user)) === "doctor";
  const rx = usePrescriptions();
  const apps = useAppointments({ enabled: isDoctor });

  const [open, setOpen] = useState(false);
  const [apptId, setApptId] = useState("");
  const [notice, setNotice] = useState(false);

  const list = [...(rx.data || [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  // Confirmed visits that don't have a prescription yet
  const issued = new Set((rx.data || []).map((p) => p.appointment_id));
  const awaiting = (apps.data || []).filter(
    (a) => String(a.status).toLowerCase() === "confirmed" && !issued.has(a.id)
  );

  const close = () => {
    setOpen(false);
    setApptId("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {isDoctor
            ? "Prescriptions you've issued."
            : "Show the QR code at the pharmacy. Scanning adds the medicines to your tracker."}
        </p>
        {isDoctor && (
          <button
            onClick={() => { setNotice(false); setOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Issue prescription
          </button>
        )}
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 size={18} /> Prescription issued. The patient can see it now.
        </div>
      )}

      {rx.isLoading ? (
        <Skeleton rows={4} />
      ) : rx.error ? (
        <ErrorBox message={rx.error.message} onRetry={rx.refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No prescriptions yet"
          body={isDoctor ? "Confirm an appointment, then issue a prescription for it." : "After a visit, your doctor's prescription appears here with a QR code."}
        />
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <PrescriptionCard key={p.id} prescription={p} perspective={isDoctor ? "doctor" : "patient"} />
          ))}
        </ul>
      )}

      {isDoctor && (
        <Modal open={open} onClose={close} wide title="Issue prescription" description="Choose the appointment this prescription belongs to.">
          <div className="mb-5">
            <label htmlFor="appt-pick" className="mb-1.5 block text-sm font-medium">Appointment</label>
            <select
              id="appt-pick"
              value={apptId}
              onChange={(e) => setApptId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-200"
            >
              <option value="">{apps.isLoading ? "Loading…" : "Select a confirmed appointment…"}</option>
              {awaiting.map((a) => (
                <option key={a.id} value={a.id}>
                  #{a.id} · {a.patient?.full_name || "Patient"} · {formatDate(a.appointment_date)} {formatTime(a.appointment_time)}
                </option>
              ))}
            </select>
            {!apps.isLoading && awaiting.length === 0 && (
              <p className="mt-2 text-xs text-muted">
                No confirmed appointments are waiting for a prescription. Confirm a visit first.
              </p>
            )}
          </div>

          {apptId && (
            <IssuePrescriptionForm
              key={apptId}
              appointmentId={apptId}
              onCancel={close}
              onDone={() => { close(); setNotice(true); }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}