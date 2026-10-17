import { useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import Avatar from "../components/layout/Avatar";
import Modal from "../components/ui/Modal";
import CreateDoctorForm from "../components/admin/CreateDoctorForm";
import { EmptyState, ErrorBox, Skeleton } from "../components/dashboard/Panel";
import {
  useAdminDoctors, useAdminPatients, usePendingUsers, useRemoveUser, useVerifyUser,
} from "../hooks/useClinicData";
import { formatDate, pretty } from "../utils/format";

const TABS = [
  { id: "pending", label: "Pending" },
  { id: "patients", label: "Patients" },
  { id: "doctors", label: "Doctors" },
];

export default function AdminUsers() {
  const pending = usePendingUsers();
  const patients = useAdminPatients();
  const doctors = useAdminDoctors();
  const verify = useVerifyUser();
  const remove = useRemoveUser();

  const [tab, setTab] = useState("pending");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const query = { pending, patients, doctors }[tab];
  const list = query.data || [];
  const counts = { pending: pending.data?.length, patients: patients.data?.length, doctors: doctors.data?.length };

  const onRemove = (u) => {
    if (window.confirm(`Remove ${u.full_name}? This can't be undone.`)) remove.mutate(u.id);
  };

  const error = verify.error || remove.error;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Verify new patients and manage doctor accounts.</p>
        <button
          onClick={() => { setNotice(""); setOpen(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <UserPlus size={16} /> Register doctor
        </button>
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 size={18} /> {notice}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              tab === t.id ? "bg-navy text-white" : "bg-white text-muted ring-1 ring-slate-200 hover:text-navy"
            }`}
          >
            {t.label} <span className="opacity-70">{counts[t.id] ?? "–"}</span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error.message}</p>}

      {query.isLoading ? (
        <Skeleton rows={4} />
      ) : query.error ? (
        <ErrorBox message={query.error.message} onRetry={query.refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={tab === "pending" ? "All caught up" : `No ${tab} yet`}
          body={tab === "pending" ? "No patients are waiting for verification." : "They appear here once accounts exist."}
        />
      ) : (
        <ul className="space-y-3">
          {list.map((u) => {
            const verifying = verify.isPending && verify.variables === u.id;
            const removing = remove.isPending && remove.variables === u.id;
            const needsVerify = String(u.role).toLowerCase() === "patient" && u.is_verified === false;
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Avatar user={u} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {u.full_name}
                    {u.specialization && <span className="font-normal text-muted"> · {pretty(u.specialization)}</span>}
                  </p>
                  <p className="truncate text-xs text-muted">{u.email} · joined {formatDate(u.created_at)}</p>
                </div>

                {tab !== "doctors" && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${needsVerify ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                    {needsVerify ? "Unverified" : "Verified"}
                  </span>
                )}

                <div className="flex gap-2">
                  {needsVerify && (
                    <button
                      disabled={verifying}
                      onClick={() => verify.mutate(u.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {verifying && <Loader2 size={13} className="animate-spin" />} Verify
                    </button>
                  )}
                  <button
                    disabled={removing}
                    onClick={() => onRemove(u)}
                    aria-label={`Remove ${u.full_name}`}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-muted hover:bg-red-50 hover:text-danger disabled:opacity-60"
                  >
                    {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Register doctor" description="They sign in with these details and can change the password later.">
        <CreateDoctorForm
          onCancel={() => setOpen(false)}
          onDone={(name) => {
            setOpen(false);
            setTab("doctors");
            setNotice(`${name}'s account was registered. Patients can now book with them.`);
          }}
        />
      </Modal>
    </div>
  );
}