import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CheckCircle2, Keyboard, Loader2, RotateCcw, TriangleAlert, Upload } from "lucide-react";
import QRScanner, { extractToken } from "../components/prescriptions/QRScanner";
import { Panel } from "../components/dashboard/Panel";
import { useScanPrescription } from "../hooks/useClinicData";
import { useAuthStore } from "../store/authStore";
import { pretty, roleOf } from "../utils/format";

const MODES = [
  { id: "camera", label: "Camera", icon: Camera },
  { id: "upload", label: "Upload image", icon: Upload },
  { id: "manual", label: "Enter code", icon: Keyboard },
];

function errorText(err) {
  if (err.status === 429) return "Too many scans. Please wait a minute and try again.";
  if (err.status === 404) return "Invalid, expired or revoked QR code, or it belongs to another patient.";
  return err.message || "Could not scan this code.";
}

export default function Scan() {
  const role = roleOf(useAuthStore((s) => s.user));
  const scan = useScanPrescription();
  const [mode, setMode] = useState("camera");
  const [lastText, setLastText] = useState("");
  const [localError, setLocalError] = useState("");
  const [manual, setManual] = useState("");
  const fileRef = useRef(null);

  const submit = (text) => {
    setLastText(text);
    setLocalError("");
    scan.mutate(extractToken(text));
  };

  const reset = () => {
    scan.reset();
    setLastText("");
    setLocalError("");
    setManual("");
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLocalError("");
    const reader = new Html5Qrcode("qr-file-reader");
    try {
      const text = await reader.scanFile(file, false);
      submit(text);
    } catch {
      setLocalError("No QR code found in that image. Try a clearer, closer picture.");
    } finally {
      try { reader.clear(); } catch { /* nothing to clear */ }
    }
  };

  const result = scan.data;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <p className="text-sm text-muted">
        {role === "patient"
          ? "Scan your prescription's QR code to add its medicines to your tracker."
          : "Scan a patient's prescription QR code to verify it."}
      </p>

      {result ? (
        <Panel title="Prescription verified">
          <div className="flex items-start gap-3 rounded-xl bg-green-50 p-4 text-green-800">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Prescription #{result.prescription_id}</p>
              <p>Patient: {result.patient?.full_name}</p>
              <p className="mt-1">
                {result.medications_created > 0
                  ? `${result.medications_created} medication${result.medications_created > 1 ? "s" : ""} added to the tracker.`
                  : "No new medications were added (they may already be in the tracker)."}
              </p>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            {(result.items || []).map((i) => (
              <li key={i.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold">{i.drug_name}</p>
                <p className="text-sm text-muted">
                  {i.dosage} · {pretty(i.frequency)} · {i.duration_days} day{i.duration_days === 1 ? "" : "s"}
                </p>
                {i.instructions && <p className="mt-0.5 text-xs text-muted">{i.instructions}</p>}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
              <RotateCcw size={15} /> Scan another
            </button>
            {role === "patient" && (
              <Link to="/medications" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Go to medications
              </Link>
            )}
            <Link to={`/prescriptions/${result.prescription_id}`} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
              View prescription
            </Link>
          </div>
        </Panel>
      ) : (
        <Panel title="Scan a prescription">
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); scan.reset(); setLocalError(""); }}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                  mode === m.id ? "bg-white shadow-sm" : "text-muted hover:text-navy"
                }`}
              >
                <m.icon size={15} /> {m.label}
              </button>
            ))}
          </div>

          {scan.isPending ? (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" /> Checking the code…
            </p>
          ) : (
            <>
              {mode === "camera" && !scan.error && <QRScanner key="camera" onResult={submit} />}

              {mode === "upload" && (
                <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
                  <Upload className="mx-auto text-muted" size={28} />
                  <p className="mt-2 text-sm text-muted">Choose a screenshot or photo of the QR code.</p>
                  <button onClick={() => fileRef.current?.click()} className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                    Choose image
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
                </div>
              )}

              {mode === "manual" && (
                <form
                  onSubmit={(e) => { e.preventDefault(); if (manual.trim()) submit(manual); }}
                  className="space-y-3"
                >
                  <label htmlFor="qr-manual" className="block text-sm font-medium">Prescription code</label>
                  <input
                    id="qr-manual"
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    placeholder="Paste the code here"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-200"
                  />
                  <button type="submit" disabled={!manual.trim()} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    Verify code
                  </button>
                </form>
              )}
            </>
          )}

          {(scan.error || localError) && (
            <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-danger">
              <p className="flex items-start gap-2">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                {localError || errorText(scan.error)}
              </p>
              {scan.error && lastText && (
                <p className="mt-2 break-all text-xs text-slate-600">
                  Scanned text: <code>{lastText.length > 120 ? `${lastText.slice(0, 120)}…` : lastText}</code>
                </p>
              )}
              {scan.error && (
                <button onClick={reset} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50">
                  <RotateCcw size={13} /> Try again
                </button>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* Hidden mount point used to decode uploaded images */}
      <div id="qr-file-reader" className="hidden" />
    </div>
  );
}