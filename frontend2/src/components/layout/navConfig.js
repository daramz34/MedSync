import {
  LayoutDashboard, CalendarCheck, FileText, Pill, ScanLine, User, Users, BarChart3, MessageSquare,
} from "lucide-react";

const dash = { to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard, tab: true };
const scan = { to: "/scan", label: "Scan QR", short: "Scan", icon: ScanLine, tab: true };

export const NAV = {
  patient: [
    dash,
    { to: "/appointments", label: "Appointments", short: "Visits", icon: CalendarCheck, tab: true },
    { to: "/prescriptions", label: "Prescriptions", short: "Rx", icon: FileText, tab: true },
    { to: "/medications", label: "Medications", short: "Meds", icon: Pill, tab: true },
    scan,
    { to: "/profile", label: "Profile", icon: User },
  ],
  doctor: [
    dash,
    { to: "/doctor/appointments", label: "Appointments", short: "Visits", icon: CalendarCheck, tab: true },
    { to: "/doctor/prescriptions", label: "Prescriptions", short: "Rx", icon: FileText, tab: true },
    scan,
    { to: "/profile", label: "Profile", short: "Profile", icon: User, tab: true },
  ],
  admin: [
    dash,
    { to: "/admin/users", label: "Users", short: "Users", icon: Users, tab: true },
    { to: "/admin/feedback", label: "Feedback", short: "Feedback", icon: MessageSquare, tab: true },
    { to: "/admin/stats", label: "Statistics", short: "Stats", icon: BarChart3, tab: true },
    { to: "/profile", label: "Profile", short: "Profile", icon: User, tab: true },
  ],
};

export const navFor = (role) => NAV[role] || NAV.patient;