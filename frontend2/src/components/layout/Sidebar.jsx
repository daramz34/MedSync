import { Link, NavLink } from "react-router-dom";
import { HeartPulse, TriangleAlert } from "lucide-react";

export default function Sidebar({ links }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <Link to="/dashboard" className="flex h-16 items-center gap-2 border-b border-slate-100 px-6 font-bold">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
          <HeartPulse size={20} />
        </span>
        <span className="text-lg">MedSync</span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/dashboard"}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:bg-slate-100 hover:text-navy"
              }`
            }
          >
            <l.icon size={18} />
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="m-4 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700">
        <p className="flex items-center gap-1.5 font-semibold">
          <TriangleAlert size={14} /> Not for emergencies
        </p>
        <p className="mt-1">In an emergency, call your local emergency number.</p>
      </div>
    </aside>
  );
}