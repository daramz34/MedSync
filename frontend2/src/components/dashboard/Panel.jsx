export function Panel({ title, description, action, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-center">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-primary">
          <Icon size={22} />
        </span>
        <h3 className="mt-3 text-sm font-semibold">{title}</h3>
        <p className="mx-auto mt-1 max-w-[38ch] text-sm leading-6 text-muted">{body}</p>
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ rows = 2 }) {
  return (
    <div className="grid gap-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-center">
      <p className="text-sm font-semibold text-danger">Could not load this section</p>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
        >
          Try again
        </button>
      )}
    </div>
  );
}