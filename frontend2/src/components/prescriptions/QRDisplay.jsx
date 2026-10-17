import { useState } from "react";
import { Check, Clock, Download, Share2, ShieldOff } from "lucide-react";
import { formatDate } from "../../utils/format";

export function qrState(p) {
  if (p.qr_revoked_at) return "revoked";
  if (p.qr_expires_at && new Date(p.qr_expires_at) < new Date()) return "expired";
  if (p.qr_first_used_at) return "used";
  return "active";
}

const META = {
  active: { label: "QR active", tone: "bg-green-100 text-green-700" },
  used: { label: "Scanned", tone: "bg-blue-100 text-primary" },
  expired: { label: "QR expired", tone: "bg-amber-100 text-amber-700" },
  revoked: { label: "QR revoked", tone: "bg-red-100 text-red-700" },
};

export function QrBadge({ prescription }) {
  const m = META[qrState(prescription)];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.tone}`}>
      {m.label}
    </span>
  );
}

async function downloadImage(url, name) {
  try {
    const blob = await (await fetch(url)).blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    // Cross-origin images can block fetch; open it so it can be saved manually.
    window.open(url, "_blank", "noopener");
  }
}

export default function QRDisplay({ prescription: p }) {
  const [copied, setCopied] = useState(false);
  const state = qrState(p);
  const dead = state === "revoked" || state === "expired";

  if (!p.qr_code_url) {
    return <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-muted">No QR code was generated for this prescription.</p>;
  }

  const share = async () => {
    const data = { title: `Prescription #${p.id}`, text: "My MedSync prescription QR code", url: p.qr_code_url };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(p.qr_code_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xs text-center">
      <div className="relative mx-auto w-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <img
          src={p.qr_code_url}
          alt={`QR code for prescription ${p.id}`}
          className={`h-52 w-52 object-contain transition ${dead ? "opacity-20 grayscale" : ""}`}
        />
        {dead && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow">
              <ShieldOff size={15} className="text-danger" />
              {state === "revoked" ? "Revoked" : "Expired"}
            </span>
          </div>
        )}
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted">
        <Clock size={14} />
        {p.qr_expires_at ? `${dead && state === "expired" ? "Expired" : "Expires"}: ${formatDate(p.qr_expires_at)}` : "No expiry set"}
      </p>
      {p.qr_first_used_at && (
        <p className="mt-1 text-xs text-muted">First scanned {formatDate(p.qr_first_used_at)}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => downloadImage(p.qr_code_url, `prescription-${p.id}.png`)}
          disabled={dead}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <Download size={15} /> Download
        </button>
        <button
          onClick={share}
          disabled={dead}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {copied ? <Check size={15} /> : <Share2 size={15} />} {copied ? "Link copied" : "Share"}
        </button>
      </div>
    </div>
  );
}