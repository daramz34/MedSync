import { useState } from "react";
import { CalendarPlus, CheckCircle2, ShieldAlert } from "lucide-react";
import AppointmentList from "../components/appointments/AppointmentList";
import BookingForm from "../components/appointments/BookingForm";
import Modal from "../components/ui/Modal";
import { useAppointments } from "../hooks/useClinicData";
import { useAuthStore } from "../store/authStore";

export default function Appointments() {
  const user = useAuthStore((s) => s.user);
  const unverified = user?.is_verified === false;
  const apps = useAppointments();
  const [open, setOpen] = useState(false);
  const [booked, setBooked] = useState(false);

  const openBooking = () => {
    setBooked(false);
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      {unverified && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">Your account hasn&rsquo;t been verified by the admin yet.</span>{" "}
            You can&rsquo;t book appointments until the clinic confirms your identity. Sign out and back in once
            you&rsquo;ve been approved.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Request visits and follow their status.</p>
        <button
          onClick={openBooking}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <CalendarPlus size={16} /> Book appointment
        </button>
      </div>

      {booked && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          Request sent. It shows as pending until your doctor confirms it.
        </div>
      )}

      <AppointmentList
        query={apps}
        perspective="patient"
        emptyAction={
          <button onClick={openBooking} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Book appointment
          </button>
        }
      />

      <Modal open={open} onClose={() => setOpen(false)} wide title="Book an appointment" description="Pick the kind of doctor that fits your problem.">
        <BookingForm
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            setBooked(true);
          }}
        />
      </Modal>
    </div>
  );
}