import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { EmptyState, ErrorBox, Skeleton } from "../components/dashboard/Panel";
import { useAdminFeedback, useUpdateFeedback } from "../hooks/useClinicData";
import { formatDate, pretty } from "../utils/format";

const TABS = ["open", "reviewed", "resolved", "all"];

const CATEGORY = {
  bug: { label: "Broken", tone: "bg-red-100 text-red-700" },
  confusion: { label: "Confusing", tone: "bg-amber-100 text-amber-700" },
  suggestion: { label: "Suggestion", tone: "bg-blue-100 text-primary" },
};

const STATUS_TONE = {
  open: "bg-amber-100 text-amber-700",
  reviewed: "bg-blue-100 text-primary",
  resolved: "bg-green-100 text-green-700",
};

export default function AdminFeedback() {
  const [tab, setTab] = useState("open");
  const feedback = useAdminFeedback(tab);
  const update = useUpdateFeedback();
  const list = feedback.data || [];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Problems and questions sent in by patients and doctors.</p>

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition ${
              tab === t ? "bg-navy text-white" : "bg-white text-muted ring-1 ring-slate-200 hover:text-navy"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {update.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{update.error.message}</p>
      )}

      {feedback.isLoading ? (
        <Skeleton rows={3} />
      ) : feedback.error ? (
        <ErrorBox message={feedback.error.message} onRetry={feedback.refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Nothing here" body={`No ${tab === "all" ? "" : tab + " "}feedback right now.`} />
      ) : (
        <ul className="space-y-3">
          {list.map((f) => {
            const cat = CATEGORY[f.category] || CATEGORY.bug;
            const busy = update.isPending && update.variables?.id === f.id;
            const set = (status) => update.mutate({ id: f.id, status });
            return (
              <li key={f.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cat.tone}`}>{cat.label}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_TONE[f.status] || ""}`}>
                    {f.status}
                  </span>
                  <span className="ml-auto text-xs text-muted">{formatDate(f.created_at)}</span>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm">{f.message}</p>

                <p className="mt-2 text-xs text-muted">
                  From {f.user ? `${f.user.full_name} (${pretty(f.user.role)})` : "a deleted user"}
                  {f.page_url && <> · on <code className="rounded bg-slate-100 px-1">{f.page_url}</code></>}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {f.status === "open" && (
                    <button disabled={busy} onClick={() => set("reviewed")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60">
                      Mark reviewed
                    </button>
                  )}
                  {f.status !== "resolved" && (
                    <button disabled={busy} onClick={() => set("resolved")} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
                      {busy && <Loader2 size={12} className="animate-spin" />} Resolve
                    </button>
                  )}
                  {f.status !== "open" && (
                    <button disabled={busy} onClick={() => set("open")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60">
                      Reopen
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}