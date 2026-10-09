import { Link } from 'react-router-dom'

const DESIGNS = [
  { to: '/design/clinic-desk', name: 'Clinic Desk', note: 'Clinical, utilitarian. Hero is an appointment board.' },
  { to: '/design/care-journal', name: 'Care Journal', note: 'Editorial, calm. Hero is a vertical care timeline.' },
  { to: '/design/care-in-motion', name: 'Care in Motion', note: 'Bold, asymmetric. Hero is a booking panel + QR.' },
]

export default function DesignSwitcher() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-2xl font-semibold text-ink">Design trials</h1>
      <p className="mt-2 text-muted">Open each in a new tab, resize to mobile, then pick a winner.</p>

      <ul className="mt-8 space-y-3">
        {DESIGNS.map((design, index) => (
          <li key={design.to}>
            <Link
              to={design.to}
              className="flex items-start gap-4 rounded-md border border-line bg-surface px-5 py-4 transition-colors hover:border-primary-border hover:bg-primary-tint"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary-tint font-semibold text-primary">
                {index + 1}
              </span>
              <span>
                <span className="block font-semibold text-ink">{design.name}</span>
                <span className="mt-0.5 block text-sm text-muted">{design.note}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
