import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
    </div>
  );
}

// Logged-in only. Pass roles={["doctor"]} to restrict by role.
export function ProtectedRoute({ roles }) {
  const { user, initializing } = useAuthStore();
  const location = useLocation();

  if (initializing) return <Loading />;
  if (!user) return <Navigate to="/sign-in" replace state={{ from: location }} />;
  if (roles && !roles.includes(String(user.role).toLowerCase())) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// Sign in / sign up pages: bounce away if already logged in.
export function PublicOnlyRoute() {
  const { user, initializing } = useAuthStore();
  if (initializing) return <Loading />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}