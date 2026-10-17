const tones = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-primary",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }) {
  const s = String(status || "pending").toLowerCase();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize transition-colors duration-300 ${
        tones[s] || tones.pending
      }`}
    >
      {s}
    </span>
  );
}