import AppointmentList from "../components/appointments/AppointmentList";
import { useAppointments } from "../hooks/useClinicData";

export default function DoctorAppointments() {
  const apps = useAppointments();
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Confirm requests, then open a visit to add notes or complete it.</p>
      <AppointmentList query={apps} perspective="doctor" />
    </div>
  );
}