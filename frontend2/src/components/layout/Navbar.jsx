import { useState } from "react";
import { Link } from "react-router-dom";
import { HeartPulse, Menu, X } from "lucide-react";

const links = [
  { label: "How it works", href: "#how" },
  { label: "Who it's for", href: "#audience" },
  { label: "Tracker", href: "#tracker" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-navy">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
            <HeartPulse size={20} />
          </span>
          <span className="text-lg">MedSync</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted transition hover:text-navy"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/sign-in"
            className="rounded-md px-4 py-2 text-sm font-semibold text-navy transition hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            to="/sign-up"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Get started
          </Link>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-navy hover:bg-slate-100"
            >
              {l.label}
            </a>
          ))}
          <div className="flex gap-2 pt-2">
            <Link
              to="/sign-in"
              className="flex-1 rounded-md border border-slate-200 py-2 text-center text-sm font-semibold"
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="flex-1 rounded-md bg-primary py-2 text-center text-sm font-semibold text-white"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}