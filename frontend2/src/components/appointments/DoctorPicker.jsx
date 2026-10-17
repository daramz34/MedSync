import { useState } from "react";
import { Brain, Check, Eye, Activity, Smile, Stethoscope, Users } from "lucide-react";
import Avatar from "../layout/Avatar";
import { useDoctors } from "../../hooks/useClinicData";
import { pretty } from "../../utils/format";

const AREAS = [
  { id: "all", label: "All doctors", hint: "Browse everyone", icon: Users },
  { id: "general", label: "General", hint: "Fever, cold, check-ups", icon: Stethoscope },
  { id: "optometrist", label: "Eye care", hint: "Vision, eye pain, glasses", icon: Eye },
  { id: "dentist", label: "Dentist", hint: "Teeth, gums, mouth pain", icon: Smile },
  { id: "psychologist", label: "Mental health", hint: "Stress, anxiety, mood", icon: Brain },
  { id: "physiotherapist", label: "Physio", hint: "Muscle, joint, back pain", icon: Activity },
];

const spec = (d) => String(d.specialization || "").toLowerCase();

export default function DoctorPicker({ value, onChange, error }) {
  const doctors = useDoctors();
  const [area, setArea] = useState("all");

  // Only real doctors (never admins or patients)
 const all = (doctors.data || []).filter(
  (d) => d.specialization && (!d.role || String(d.role).toLowerCase() === "doctor")
);
  const shown = area === "all" ? all : all.filter((d) => spec(d) === area);
  const current = AREAS.find((a) => a.id === area);

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">What do you need help with?</p>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {AREAS.map((a) => {
          const n = a.id === "all" ? all.length : all.filter((d) => spec(d) === a.id).length;
          const on = area === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setArea(a.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                on ? "bg-primary text-white shadow-sm" : "bg-white text-muted ring-1 ring-slate-200 hover:text-navy"
              }`}
            >
              <a.icon size={15} /> {a.label} <span className="opacity-70">{n}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted">{current.hint}</p>

      <div className="mt-3 space-y-2" role="radiogroup" aria-label="Doctor">
        {doctors.isLoading && <div className="h-16 animate-pulse rounded-xl bg-slate-100" />}

        {doctors.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            Could not load doctors: {doctors.error.message}
          </p>
        )}

        {!doctors.isLoading && !doctors.error && all.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-muted">
            No doctors are available yet. An admin needs to add one.
          </p>
        )}

        {!doctors.isLoading && all.length > 0 && shown.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-muted">
            No {current.label.toLowerCase()} doctor yet. Choose &ldquo;All doctors&rdquo; or a General doctor.
          </p>
        )}

        {shown.map((d) => {
          const selected = String(value) === String(d.id);
          return (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(String(d.id))}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                selected ? "border-primary bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 bg-white hover:border-primary"
              }`}
            >
              <Avatar user={d} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{d.full_name}</span>
                <span className="block text-xs text-muted">
                  {d.specialization ? pretty(d.specialization) : "General practice"}
                </span>
              </span>
              {selected && (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-white">
                  <Check size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}