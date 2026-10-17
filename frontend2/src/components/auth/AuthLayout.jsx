import { Link } from "react-router-dom";
import { HeartPulse, CalendarCheck, FileText, Pill } from "lucide-react";

const perks = [
  { icon: CalendarCheck, text: "Book and track appointments" },
  { icon: FileText, text: "Prescriptions with secure QR codes" },
  { icon: Pill, text: "Daily medication streaks" },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      {/* Brand panel (desktop only) */}
      <aside className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2 font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <HeartPulse size={20} />
          </span>
          <span className="text-lg">MedSync</span>
        </Link>

        <div className="relative">
          <h2 className="max-w-sm text-3xl font-bold leading-tight">
            The next step in your care, all in one place.
          </h2>
          <ul className="mt-8 space-y-4">
            {perks.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-slate-300">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <p.icon size={18} />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-400">
          MedSync is not for medical emergencies.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 font-bold lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <HeartPulse size={20} />
            </span>
            MedSync
          </Link>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>

          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        </div>
      </main>
    </div>
  );
}