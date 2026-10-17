import { useState } from "react";
import { Link } from "react-router-dom";
import { Pill, Plus, ScanLine } from "lucide-react";
import MedicationCard from "../components/medications/MedicationCard";
import MedicationForm from "../components/medications/MedicationForm";
import Modal from "../components/ui/Modal";
import { EmptyState, ErrorBox, Skeleton } from "../components/dashboard/Panel";
import { useMedications, useTodayLogs } from "../hooks/useClinicData";

const TABS = ["active", "completed", "abandoned"];

export default function Medications() {
  const active = useMedications({ status: "active" });
  const completed = useMedications({ status: "completed" });
  const abandoned = useMedications({ status: "abandoned" });
  const today = useTodayLogs();
  const [tab, setTab] = useState("active");
  const [open, setOpen] = useState(false);

  const query = { active, completed, abandoned }[tab];
  const shown = query.data || [];
  const logsFor = (id) => (today.data || []).filter((l) => l.medication_id === id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Log each dose to build streaks.</p>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            <ScanLine size={16} /> Import prescribed medicines
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Add medication
          </button>
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition ${
              tab === t ? "bg-navy text-white" : "bg-white text-muted ring-1 ring-slate-200 hover:text-navy"
            }`}
          >
            {t === "completed" ? "Past courses" : t}{" "}
            <span className="opacity-70">{{ active, completed, abandoned }[t].data?.length ?? "–"}</span>
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <Skeleton rows={3} />
      ) : query.error ? (
        <ErrorBox message={query.error.message} onRetry={query.refetch} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={tab === "active" ? "No active medication" : `No ${tab === "completed" ? "past courses" : tab} medication`}
          body={
            tab === "active"
              ? "Import the medicines from your prescription's QR code, or add one yourself."
              : "Finished courses stay here as a record."
          }
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((m) => (
            <MedicationCard key={m.id} medication={m} todayLogs={logsFor(m.id)} />
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add a medication" description="Track a medicine that isn't from a prescription.">
        <MedicationForm onCancel={() => setOpen(false)} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  );
}