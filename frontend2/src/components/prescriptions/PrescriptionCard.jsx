import { Link } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import { QrBadge } from "./QRDisplay";
import { formatDate } from "../../utils/format";

export default function PrescriptionCard({ prescription: p, perspective = "patient" }) {
  const isDoctor = perspective === "doctor";
  const other = isDoctor ? p.patient : p.doctor;
  const items = p.items || [];

  return (
    <li className="rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/prescriptions/${p.id}`} className="flex items-center gap-4 p-4">
        <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-100 text-warning sm:grid">
          <FileText size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-sm font-semibold">
              Prescription #{p.id}
              <span className="font-normal text-muted"> · {other?.full_name || (isDoctor ? "Patient" : "Doctor")}</span>
            </p>
            <QrBadge prescription={p} />
          </div>
          <p className="mt-0.5 text-xs text-muted">Issued {formatDate(p.created_at)}</p>
          <p className="mt-1.5 truncate text-sm text-muted">
            {items.slice(0, 3).map((i) => i.drug_name).join(", ") || "No items"}
            {items.length > 3 && ` +${items.length - 3} more`}
          </p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-slate-300" />
      </Link>
    </li>
  );
}