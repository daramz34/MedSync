import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Navbar from './components/layout/Navbar.jsx'
import Footer from './components/layout/Footer.jsx'
import { RequireAuth, RequireRole, RedirectIfAuthed } from './components/auth/RouteGuards.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import PatientDashboard from './pages/PatientDashboard.jsx'
import MedicationsPage from './pages/MedicationsPage.jsx'
import AppointmentsPage from './pages/AppointmentsPage.jsx'
import PrescriptionsPage from './pages/PrescriptionsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import DoctorDashboard from './pages/DoctorDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import KitchenSink from './pages/KitchenSink.jsx'
import Chunk3Demo from './pages/Chunk3Demo.jsx'

function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public — own header/footer, NOT inside AppShell */}
      <Route path="/" element={<LandingPage />} />

      {/* Logged-in users get bounced off these */}
      <Route element={<RedirectIfAuthed />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Requires a token */}
      <Route element={<RequireAuth />}>
        {/* Patient pages — shared Navbar + Footer */}
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<PatientDashboard />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/prescriptions" element={<PrescriptionsPage />} />
          <Route path="/medications" element={<MedicationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Doctor only */}
        <Route element={<RequireRole roles={['doctor']} />}>
          <Route element={<AppShell />}>
            <Route path="/doctor" element={<DoctorDashboard />} />
          </Route>
        </Route>

        {/* Admin only */}
        <Route element={<RequireRole roles={['admin']} />}>
          <Route element={<AppShell />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      {/* Component demos — no auth needed */}
      <Route element={<AppShell />}>
        <Route path="/kitchen-sink" element={<KitchenSink />} />
        <Route path="/chunk3" element={<Chunk3Demo />} />
      </Route>

      {/* Anything unknown → home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
