import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { auth } from '../../services/auth.js'

function normalizedRole(user) {
  return String(user?.role || '')
    .toLowerCase()
    .split('.')
    .pop()
}

function homeForUser(user) {
  const role = normalizedRole(user)
  if (role === 'doctor') return '/doctor'
  if (role === 'admin') return '/admin'
  return '/dashboard'
}

export function RequireAuth() {
  const location = useLocation()

  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function RequireRole({ roles = [] }) {
  const user = auth.getStoredUser()
  const role = normalizedRole(user)
  const allowedRoles = roles.map((item) => String(item).toLowerCase())

  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={homeForUser(user)} replace />
  }

  return <Outlet />
}

export function RedirectIfAuthed() {
  if (auth.isAuthenticated()) {
    return <Navigate to={homeForUser(auth.getStoredUser())} replace />
  }

  return <Outlet />
}
