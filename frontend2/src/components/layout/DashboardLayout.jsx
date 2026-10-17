import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileTabBar from "./MobileTabBar";
import { navFor } from "./navConfig";
import FeedbackBubble from "../FeedbackBubble";
import { useAuthStore } from "../../store/authStore";
import { roleOf } from "../../utils/format";

export default function DashboardLayout() {
  const user = useAuthStore((s) => s.user);
  const role = roleOf(user);
  const links = navFor(role);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar links={links} />
      <div className="lg:pl-64">
        <Topbar links={links} role={role} />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <MobileTabBar links={links} />
      <FeedbackBubble />
    </div>
  );
}