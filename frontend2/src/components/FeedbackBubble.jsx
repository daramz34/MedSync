import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquarePlus, X } from "lucide-react";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { roleOf } from "../utils/format";

const CATEGORIES = [
  { value: "bug", label: "Something is broken" },
  { value: "confusion", label: "Something is confusing" },
  { value: "suggestion", label: "Suggestion" },
];

export default function FeedbackBubble() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Only patients and doctors send feedback; the admin receives it
  if (!user || roleOf(user) === "admin") return null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setState("sending");
    try {
      await api.post(
        "/feedback/",
        { category, message: message.trim(), page_url: window.location.pathname },
        { auth: true }
      );
      setState("sent");
      setMessage("");
      setTimeout(() => {
        setState("idle");
        setOpen(false);
      }, 1800);
    } catch (err) {
      setState("idle");
      setError(
        err.status === 429 ? "Too many reports. Please wait a minute." : err.message || "Could not send. Try again."
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Send feedback"
        title="Send feedback"
        className="fixed bottom-20 left-4 z-40 grid h-11 w-11 place-items-center rounded-full bg-primary text-white shadow-lg transition hover:scale-110 hover:bg-blue-700 lg:bottom-6 lg:left-[17rem]"
      >
        {open ? <X size={20} /> : <MessageSquarePlus size={20} />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Send feedback"
          className="fixed bottom-36 left-4 right-4 z-[55] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:right-auto sm:w-80 lg:bottom-20 lg:left-[17rem]"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Send feedback</h2>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted hover:text-navy">
              <X size={16} />
            </button>
          </div>

          {state === "sent" ? (
            <p className="mt-4 flex items-center justify-center gap-2 py-4 text-sm font-medium text-green-700">
              <CheckCircle2 size={18} /> Thanks, we got your feedback
            </p>
          ) : (
            <form onSubmit={submit} className="mt-3 space-y-2.5">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-200"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened, or what confused you?"
                required
                minLength={3}
                maxLength={2000}
                rows={4}
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-200"
              />

              {error && <p role="alert" className="text-xs text-danger">{error}</p>}

              <button
                type="submit"
                disabled={state === "sending" || message.trim().length < 3}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {state === "sending" && <Loader2 size={15} className="animate-spin" />}
                {state === "sending" ? "Sending…" : "Send feedback"}
              </button>
            </form>
          )}

          <p className="mt-3 text-center text-[11px] text-muted">Only clinic administrators can see this.</p>
        </div>
      )}
    </>
  );
}