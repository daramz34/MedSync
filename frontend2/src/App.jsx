import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import DoctorAppointments from "./pages/DoctorAppointments";
import AppointmentDetail from "./pages/AppointmentDetail";
import Prescriptions from "./pages/Prescriptions";
import PrescriptionDetail from "./pages/PrescriptionDetail";
import Medications from "./pages/Medications";
import MedicationDetail from "./pages/MedicationDetail";
import Scan from "./pages/Scan";
import DashboardLayout from "./components/layout/DashboardLayout";
import { ProtectedRoute, PublicOnlyRoute } from "./components/auth/RouteGuards";
import { useAuthStore } from "./store/authStore";
import AdminUsers from "./pages/AdminUsers";
import AdminStats from "./pages/AdminStats";
import AdminFeedback from "./pages/AdminFeedback";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Everyone logged in */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Patient only */}
      <Route element={<ProtectedRoute roles={["patient"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/prescriptions" element={<Prescriptions />} />
          <Route path="/medications" element={<Medications />} />
          <Route path="/medications/:id" element={<MedicationDetail />} />
        </Route>
      </Route>

      {/* Patient + doctor */}
      <Route element={<ProtectedRoute roles={["patient", "doctor"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/appointments/:id" element={<AppointmentDetail />} />
          <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />
          <Route path="/scan" element={<Scan />} />
        </Route>
      </Route>

      {/* Doctor only */}
      <Route element={<ProtectedRoute roles={["doctor"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/doctor/appointments" element={<DoctorAppointments />} />
          <Route path="/doctor/prescriptions" element={<Prescriptions />} />
        </Route>
      </Route>

      {/* Admin only */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
          <Route path="/admin/stats" element={<AdminStats />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}