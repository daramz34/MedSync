import { Link } from 'react-router-dom'
import LogoSlot from './LogoSlot.jsx'

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5">
          <Link to="/" className="flex items-center gap-2.5" aria-label="MedSync home">
            <LogoSlot size={32} />
            <span className="text-lg font-bold tracking-tight text-ink">MedSync</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>}

          <div className="mt-7 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
            {children}
          </div>

          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
