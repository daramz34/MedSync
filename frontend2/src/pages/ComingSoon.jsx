import { Hammer } from "lucide-react";

export default function ComingSoon({ title }) {
  return (
    <div className="grid min-h-[50vh] place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-100 text-primary">
          <Hammer size={22} />
        </span>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">This page is coming next.</p>
      </div>
    </div>
  );
}