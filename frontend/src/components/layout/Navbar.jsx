import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import LogoSlot from './LogoSlot.jsx'
import Avatar from '../ui/Avatar.jsx'
import { auth } from '../../services/auth.js'

const LINKS_BY_ROLE = {
  patient: [
    { to: '/dashboard',     label: 'Dashboard' },
    { to: '/appointments',  label: 'Appointments' },
    { to: '/prescriptions', label: 'Prescriptions' },
    { to: '/medications',   label: 'Medications' },
  ],
  doctor: [
    { to: '/doctor',        label: 'My desk' },
    { to: '/appointments',  label: 'Appointments' },
    { to: '/prescriptions', label: 'Prescriptions' },
    { to: '/medications',   label: 'Medications' },
  ],
  admin: [
    { to: '/admin',         label: 'Admin' },
    { to: '/appointments',  label: 'Appointments' },
  ],
}

function normalizeRole(value) {
  return String(value || 'patient').toLowerCase().split('.').pop()
}

function pretty(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatLongDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function MenuIcon({ open }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M3 6h18" />
          <path d="M3 12h18" />
          <path d="M3 18h18" />
        </>
      )}
    </svg>
  )
}

function InfoRow({ label, value, title }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd
        className="min-w-0 truncate text-right text-sm font-medium text-ink"
        title={title || value}
      >
        {value}
      </dd>
    </div>
  )
}

export default function Navbar() {
  const [user, setUser] = useState(() => auth.getStoredUser())
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  const accountRef = useRef(null)
  const triggerRef = useRef(null)

  const role = normalizeRole(user?.role)
  const links = LINKS_BY_ROLE[role] || LINKS_BY_ROLE.patient

  // Close both menus whenever the route changes.
  useEffect(() => {
    setUser(auth.getStoredUser())
    setMenuOpen(false)
    setAccountOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleExpired() {
      setUser(null)
      setMenuOpen(false)
      setAccountOpen(false)
      navigate('/login', { replace: true })
    }

    window.addEventListener('medsync:auth-expired', handleExpired)
    return () => window.removeEventListener('medsync:auth-expired', handleExpired)
  }, [navigate])

  // Outside click, Escape, and Tab-wrapping for the account panel.
  useEffect(() => {
    if (!accountOpen) return undefined

    function handlePointerDown(event) {
      if (
        !accountRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setAccountOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setAccountOpen(false)
        triggerRef.current?.focus()
        return
      }

      if (event.key === 'Tab' && accountRef.current) {
        const focusables = accountRef.current.querySelectorAll(
          'a[href], button:not([disabled])',
        )
        if (!focusables.length) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [accountOpen])

  function openAccount() {
    setMenuOpen(false)
    setAccountOpen((open) => !open)
  }

  function openMobileMenu() {
    setAccountOpen(false)
    setMenuOpen((open) => !open)
  }

  async function handleLogout() {
    setAccountOpen(false)
    setMenuOpen(false)
    await auth.logout()
    setUser(null)
    navigate('/login', { replace: true })
  }

  function linkClass(to) {
    const isActive = location.pathname === to

    return [
      'rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      isActive ? 'text-primary' : 'text-muted hover:text-primary',
    ].join(' ')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-5">
        <Link
          to={user ? '/dashboard' : '/'}
          className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={user ? 'MedSync dashboard' : 'MedSync home'}
        >
          <LogoSlot size={32} />
          <span className="text-lg font-bold tracking-tight text-ink">MedSync</span>
        </Link>

        {user && (
          <nav
            aria-label="Main navigation"
            className="hidden min-w-0 flex-1 items-center justify-center gap-5 md:flex"
          >
            {links.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={location.pathname === item.to ? 'page' : undefined}
                className={linkClass(item.to)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Account trigger — avatar only, no sign out in the bar */}
              <div className="relative">
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={openAccount}
                  aria-haspopup="dialog"
                  aria-expanded={accountOpen}
                  aria-controls="account-panel"
                  aria-label="Open your account"
                  className="rounded-full transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Avatar user={user} size="sm" />
                </button>

                {accountOpen && (
                  <div
                    id="account-panel"
                    ref={accountRef}
                    role="dialog"
                    aria-labelledby="account-panel-title"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(80vh,32rem)] w-[calc(100vw-4rem)] max-w-sm overflow-y-auto rounded-xl border border-line bg-surface shadow-lg focus:outline-none"
                    tabIndex={-1}
                  >
                    {/* Identity */}
                    <div className="flex items-start gap-3 border-b border-line px-4 py-4">
                      <Avatar user={user} size="md" />

                      <div className="min-w-0 flex-1">
                        <p
                          id="account-panel-title"
                          className="truncate text-sm font-semibold text-ink"
                        >
                          {user.full_name || 'User'}
                        </p>
                        {user.username && (
                          <p className="truncate text-xs text-muted">@{user.username}</p>
                        )}
                        <span className="mt-1.5 inline-flex items-center rounded-full border border-primary-border bg-primary-tint px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {pretty(role)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAccountOpen(false)
                          triggerRef.current?.focus()
                        }}
                        aria-label="Close account menu"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-background hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          aria-hidden="true"
                        >
                          <path d="M6 6l12 12" />
                          <path d="M18 6L6 18" />
                        </svg>
                      </button>
                    </div>

                    {/* Details */}
                    <dl className="px-4 py-3">
                      <InfoRow label="Email" value={user.email || '—'} />
                      <InfoRow label="Phone" value={user.phone_number || '—'} />
                      {user.specialization && (
                        <InfoRow label="Specialty" value={pretty(user.specialization)} />
                      )}
                      <InfoRow
                        label="Member since"
                        value={formatLongDate(user.created_at)}
                      />
                    </dl>

                    {/* Actions */}
                    <div className="border-t border-line px-4 py-3">
                      <Link
                        to="/profile"
                        className="flex w-full items-center justify-center rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Edit profile
                      </Link>
                    </div>

                    {/* Sign out — the last thing you scroll to */}
                    <div className="border-t border-line px-4 py-3">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile nav links only — no sign out here either */}
              <button
                type="button"
                onClick={openMobileMenu}
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
              >
                <MenuIcon open={menuOpen} />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md text-sm font-semibold text-ink transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>

      {user && menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-line bg-surface px-4 py-3 md:hidden"
        >
          <div className="mx-auto grid max-w-6xl gap-1">
            {links.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={location.pathname === item.to ? 'page' : undefined}
                className={`rounded-lg px-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  location.pathname === item.to
                    ? 'bg-primary-tint text-primary'
                    : 'text-ink hover:bg-background'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
