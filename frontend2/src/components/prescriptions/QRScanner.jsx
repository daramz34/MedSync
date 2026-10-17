import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CameraOff, Loader2 } from "lucide-react";

// The scanned text may be the raw token or a URL that contains it.
export function extractToken(raw) {
  const text = String(raw || "").trim();
  try {
    const u = new URL(text);
    return (
      u.searchParams.get("token") ||
      u.searchParams.get("qr_token") ||
      u.searchParams.get("t") ||
      u.pathname.split("/").filter(Boolean).pop() ||
      text
    );
  } catch {
    return text;
  }
}

function cameraMessage(err) {
  const s = String(err?.message || err);
  if (/permission|denied|NotAllowed/i.test(s)) return "Camera access was blocked. Allow it in your browser's site settings, or use Upload or Enter code instead.";
  if (/NotFound|no camera|Requested device/i.test(s)) return "No camera was found on this device.";
  if (!window.isSecureContext) return "Browsers only allow the camera on HTTPS or localhost. Use Upload or Enter code instead.";
  return "Could not start the camera. Try Upload or Enter code instead.";
}

export default function QRScanner({ onResult }) {
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState("");
  const handled = useRef(false);
  const callback = useRef(onResult);
  callback.current = onResult;

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode("qr-reader");

    const start = scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (handled.current) return;
          handled.current = true;
          callback.current(text);
        },
        () => {}
      )
      .then(() => !cancelled && setStarting(false))
      .catch((err) => {
        if (cancelled) return;
        setStarting(false);
        setError(cameraMessage(err));
      });

    return () => {
      cancelled = true;
      start.then(() => {
        if (scanner.isScanning) scanner.stop().then(() => scanner.clear()).catch(() => {});
      });
    };
  }, []);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-navy">
        <div id="qr-reader" className="min-h-[280px] w-full" />
        {starting && (
          <div className="absolute inset-0 grid place-items-center text-sm text-white">
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Starting camera…
            </span>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-danger">
          <CameraOff size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}