import { NavLink } from "react-router-dom";

export default function MobileTabBar({ links }) {
  const tabs = links.filter((l) => l.tab);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((l) => (
          <li key={l.to}>
            <NavLink
              to={l.to}
              end={l.to === "/dashboard"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                  isActive ? "text-primary" : "text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`rounded-full px-4 py-1 transition ${isActive ? "bg-blue-50" : ""}`}>
                    <l.icon size={20} />
                  </span>
                  {l.short || l.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}