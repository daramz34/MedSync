import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, HeartPulse, LogOut, User } from "lucide-react";
import Avatar from "./Avatar";
import { useAuthStore } from "../../store/authStore";
import { useNotifications } from "../../hooks/useClinicData";
import { pretty } from "../../utils/format";

function useDismiss(ref, onClose) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

const pop = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.15 },
};

export default function Topbar({ links, role }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const notifications = useNotifications(role);

  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const bellRef = useRef(null);
  const menuRef = useRef(null);
  const closeBell = useCallback(() => setBellOpen(false), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDismiss(bellRef, closeBell);
  useDismiss(menuRef, closeMenu);

  const current = links.find((l) => pathname.startsWith(l.to));

  const signOut = async () => {
    await logout();
    navigate("/sign-in");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <HeartPulse size={18} />
            </span>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">{current?.label || "MedSync"}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => { setBellOpen((o) => !o); setMenuOpen(false); }}
              aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-slate-100 hover:text-navy"
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-white" />
              )}
            </button>
            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  {...pop}
                  className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Notifications</p>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted">You&rsquo;re all caught up.</p>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        to={n.to}
                        onClick={closeBell}
                        className="block px-4 py-3 text-sm hover:bg-slate-50"
                      >
                        {n.text}
                      </Link>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => { setMenuOpen((o) => !o); setBellOpen(false); }}
              aria-label="Account menu"
              className="rounded-full transition hover:opacity-90"
            >
              <Avatar user={user} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  {...pop}
                  className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold">{user?.full_name}</p>
                    <p className="truncate text-xs text-muted">{user?.email}</p>
                    <span className="mt-2 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {pretty(role)}
                    </span>
                  </div>
                  <Link
                    to="/profile"
                    onClick={closeMenu}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50"
                  >
                    <User size={16} /> Profile settings
                  </Link>
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-danger hover:bg-red-50"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}