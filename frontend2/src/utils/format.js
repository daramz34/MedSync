export function toList(r) {
  if (Array.isArray(r)) return r;
  return r?.results ?? r?.items ?? [];
}

export function todayIso(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatDate(v, opts = { day: "numeric", month: "short", year: "numeric" }) {
  if (!v) return "—";
  const s = String(v).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? s : new Intl.DateTimeFormat("en-GB", opts).format(d);
}

export const formatTime = (v) => (v ? String(v).slice(0, 5) : "—");

export function pretty(v) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "there";

export function initials(n) {
  const parts = String(n || "?").trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export const roleOf = (u) => String(u?.role || "").toLowerCase();

// Doses expected per day, from the backend Frequency enum
export function dosesPerDay(frequency) {
  const f = String(frequency || "").toLowerCase();
  if (f === "twice_daily") return 2;
  if (f === "three_times_daily") return 3;
  return 1;
}

export function courseProgress(m) {
  if (!m?.start_date || !m?.duration_days) return null;
  const [y, mo, d] = String(m.start_date).slice(0, 10).split("-").map(Number);
  const start = new Date(y, mo - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const total = Number(m.duration_days);
  const day = Math.round((now - start) / 86400000) + 1;
  if (day < 1) return { label: "Starts " + start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) };
  if (day > total) return { label: "Course ended" };
  return { label: day === total ? "Last day" : `Day ${day} of ${total}` };
}