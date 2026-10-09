import { Link } from 'react-router-dom'
import LogoSlot from './LogoSlot.jsx'
import Icon from '../ui/Icon.jsx'

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoSlot size={32} />
            <span className="font-semibold text-ink">MedSync</span>
          </div>

          
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-md border border-danger-border bg-danger-tint p-4">
          <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-sm text-ink/80">
            <span className="font-semibold text-danger">Not for emergencies.</span> If you have a
            medical emergency, contact your local emergency services immediately.
          </p>
        </div>

        <p className="mt-6 text-xs leading-5 text-muted">
          © 2026 MedSync. MedSync helps organise care information; it is not a substitute for
          professional medical advice.
        </p>
      </div>
    </footer>
  )
}
