const tones = {
  blue: "bg-blue-100 text-primary",
  green: "bg-green-100 text-accent",
  amber: "bg-amber-100 text-warning",
  red: "bg-red-100 text-danger",
  orange: "bg-orange-100 text-orange-500",
};

export default function StatCard({ label, value, note, icon: Icon, tone = "blue", loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-1.5 text-3xl font-bold leading-none tracking-tight">{value}</p>
          )}
          {note && <p className="mt-1.5 truncate text-xs text-muted">{note}</p>}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}