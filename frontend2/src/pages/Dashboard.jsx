import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import PatientDashboard from "../components/dashboard/PatientDashboard";
import DoctorDashboard from "../components/dashboard/DoctorDashboard";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import { firstName, formatDate, greeting, pretty, roleOf } from "../utils/format";

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const role = roleOf(user);
  const name = role === "doctor" ? `Dr. ${String(user?.full_name || "").trim().split(/\s+/).pop()}` : firstName(user?.full_name);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted">
          {formatDate(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting()}, {name}
        </h2>
        {user?.specialization && (
          <p className="mt-1 text-sm text-muted">{pretty(user.specialization)}</p>
        )}
      </motion.div>

      {role === "doctor" ? <DoctorDashboard /> : role === "admin" ? <AdminDashboard /> : <PatientDashboard user={user} />}
    </div>
  );
}