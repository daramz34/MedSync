import { Link } from 'react-router-dom'
import { cn } from '../utils/cn.js'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import LogoSlot from '../components/layout/LogoSlot.jsx'
import Card, { CardBody } from '../components/ui/Card.jsx'

const FLOW_STEPS = [
  { number: '01', icon: 'calendar', title: 'Book', description: 'Request an appointment.' },
  { number: '02', icon: 'heart', title: 'Visit', description: 'Discuss your care with a clinician.' },
  { number: '03', icon: 'prescription', title: 'Prescription', description: 'Review your prescribed treatment.' },
  { number: '04', icon: 'activity', title: 'Track', description: 'Log doses and follow your progress.' },
]

const DOSES = [
  { label: 'Metformin 500 mg', time: 'With breakfast, 8:00', taken: true },
  { label: 'Lisinopril 10 mg', time: 'Morning, 8:00', taken: true },
  { label: 'Metformin 500 mg', time: 'With dinner, 19:00', taken: false },
]
const ROLES = [
  {
    icon: 'user',
    title: 'Patients',
    blurb: 'Stay on top of your own care.',
    points: [
      'Book and track appointments',
      'View prescriptions and show the QR code at the pharmacy',
      'Mark doses as taken and keep your streak',
    ],
    to: '/register',
  },
  {
    icon: 'stethoscope',
    title: 'Doctors',
    blurb: 'Handle requests without the paperwork.',
    points: [
      'Review and confirm appointment requests',
      'Update visit status as it changes',
      'Issue prescriptions to your patients',
    ],
    to: '/login',
  },
  {
    icon: 'clipboard',
    title: 'Clinic administrators',
    blurb: 'Keep the clinic running smoothly.',
    points: [
      'Create doctor accounts',
      'Deactivate users who have left',
      'See clinic-wide appointment statistics',
    ],
    to: '/login',
  },
]

const FEATURES = [
  {
    title: 'Appointments',
    body: 'See every visit with a clear status: pending, confirmed, completed or cancelled. Status is always written out, never shown by colour alone.',
  },
  {
    title: 'Prescriptions',
    body: "View dosage, duration and the doctor's notes. Allergy warnings appear in red at the top so they are never missed.",
  },
  {
    title: 'Medications',
    body: 'A daily list of active medications, a one-tap "taken" button, and a calendar of your adherence over time.',
  },
]
function Tag({ tone = 'primary', children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        tone === 'solid'
          ? 'bg-primary text-white'
          : 'border border-primary-border bg-primary-tint text-primary',
      )}
    >
      {children}
    </span>
  )
}

function Dose({ label, time, taken }) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0">
      <span
        aria-hidden="true"
        className={cn(
          'grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border-2 border-primary',
          taken && 'bg-primary',
        )}
      >
        {taken && <Icon name="check" size={14} className="text-white" />}
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-muted">{time}</p>
      </div>
    </div>
  )
}

function QrSample() {
  const SIZE = 21
  const modules = []
  let seed = 7

  function finder(x, y, ox, oy) {
    const a = x - ox
    const b = y - oy
    return (
      a >= 0 && a < 7 && b >= 0 && b < 7 &&
      (a === 0 || a === 6 || b === 0 || b === 6 || (a >= 2 && a <= 4 && b >= 2 && b <= 4))
    )
  }

  function inFinderZone(x, y) {
    return (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)
  }

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let on
      if (inFinderZone(x, y)) {
        on = finder(x, y, 0, 0) || finder(x, y, 14, 0) || finder(x, y, 0, 14)
      } else {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        on = (seed >> 8) % 2 === 0
      }
      if (on) {
        modules.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)
      }
    }
  }

  return (
    <svg
      viewBox="0 0 21 21"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Sample prescription QR code; it is not scannable"
      className="h-24 w-24 shrink-0 rounded-[10px] border border-line bg-surface p-1.5 text-ink"
      fill="currentColor"
    >
      {modules}
    </svg>
  )
}
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="MedSync home"
          >
            <LogoSlot size={32} />
            <span className="text-lg font-bold tracking-tight text-ink">MedSync</span>
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-7">
              <li>
                <a href="#who" className="text-sm font-medium text-muted transition-colors hover:text-primary">
                  Who it is for
                </a>
              </li>
              <li>
                <a href="#how" className="text-sm font-medium text-muted transition-colors hover:text-primary">
                  How it works
                </a>
              </li>
              <li>
                <a href="#features" className="text-sm font-medium text-muted transition-colors hover:text-primary">
                  Features
                </a>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" to="/login">
              Sign in
            </Button>
            <Button size="sm" to="/register">
              Create account
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-14 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <div>
              <h1 className="max-w-[16ch] text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
                Your appointments, prescriptions and medications in one place.
              </h1>
              <p className="mt-5 max-w-[52ch] text-lg leading-7 text-muted">
                MedSync connects patients, doctors and clinic staff so care stays organised: book a
                visit, collect a prescription with a QR code, and keep a daily record of the
                medication you have taken.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button to="/register">Create patient account</Button>
                <Button variant="secondary" to="/login">
                  Sign in
                </Button>
              </div>
              <p className="mt-7 flex max-w-[52ch] items-start gap-3 rounded-lg border border-line bg-primary-tint px-4 py-3.5 text-sm leading-6 text-muted">
                <Icon name="alert" size={20} className="mt-0.5 shrink-0 text-danger" />
                <span>
                  MedSync is a clinic organisation tool. It is not a telehealth or emergency
                  service. In an emergency, contact your local emergency number.
                </span>
              </p>
            </div>

            <div
              role="img"
              aria-label="Preview of the MedSync patient view: today's medications with a streak counter, a prescription with an allergy warning and QR code, and a confirmed follow-up visit. Sample data."
              className="grid gap-3.5 rounded-3xl border border-line bg-primary-tint p-5"
            >
              <Card>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-ink">Today&rsquo;s medication</h2>
                      <p className="mt-0.5 text-sm text-muted">2 of 3 doses taken</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold leading-none text-ink">12</p>
                      <p className="mt-1 text-xs text-muted">day streak</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    {DOSES.map((dose) => (
                      <Dose key={dose.label + dose.time} {...dose} />
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-ink">Prescription RX-20418</h2>
                      <p className="mt-0.5 text-sm text-muted">Dr. A. Okafor · Issued 28 Sep</p>
                      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-3 py-1 text-xs font-semibold text-danger">
                        <Icon name="alert" size={14} />
                        Allergy: Penicillin
                      </span>
                    </div>
                    <QrSample />
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-ink">Follow-up visit</h2>
                      <p className="mt-0.5 text-sm text-muted">Thu 8 Oct, 10:30 · General Medicine</p>
                    </div>
                    <Tag tone="solid">Confirmed</Tag>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>
        <section id="who" className="scroll-mt-20 border-y border-line bg-background py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-[22ch] text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Built for everyone in the care loop
            </h2>
            <p className="mt-3 max-w-[60ch] text-base text-muted">
              Each person signs in to a dashboard that shows only what their role needs.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map((role) => (
                <Card key={role.title} className="h-full">
                  <CardBody>
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-tint text-primary">
                      <Icon name={role.icon} size={22} />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-ink">{role.title}</h3>
                    <p className="mt-1 text-sm text-muted">{role.blurb}</p>
                    <ul className="mt-4 space-y-2 text-sm text-muted">
                      {role.points.map((point) => (
                        <li key={point} className="flex items-start gap-2.5">
                          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-primary" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={role.to}
                      className="mt-5 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
                    >
                      Continue
                      {/* requires arrowRight in Icon.jsx PATHS */}
                      <Icon name="arrowRight" size={16} />
                    </Link>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-20 py-16">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  A connected care journey
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  How a visit works in MedSync
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted">
                From the first request to the last dose, every step is recorded.
              </p>
            </div>

            <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FLOW_STEPS.map((step) => (
                <li key={step.number} className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-white">
                      {step.number}
                    </span>
                    <Icon name={step.icon} size={22} className="text-primary" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-y border-line bg-background py-16">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-[22ch] text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              What you can do with MedSync
            </h2>
            <p className="mt-3 max-w-[60ch] text-base text-muted">
              Three tools, each designed to be used in under a minute.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="h-full">
                  <CardBody>
                    <h3 className="text-lg font-semibold text-ink">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-primary px-8 py-10 sm:px-12">
              <h2 className="max-w-[20ch] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Register as a patient in two minutes.
              </h2>
              <Link
                to="/register"
                className="inline-flex h-13 items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-primary shadow-lg shadow-ink/20 transition-colors duration-150 hover:bg-primary-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Create patient account
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">
              Doctor and administrator accounts are created by your clinic&rsquo;s administrator.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-11">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap justify-between gap-8">
            <div>
              <Link
                to="/"
                className="flex items-center gap-2.5 rounded-md"
                aria-label="MedSync home"
              >
                <LogoSlot size={32} />
                <span className="text-lg font-bold tracking-tight text-ink">MedSync</span>
              </Link>
              <p className="mt-3.5 max-w-[34ch] text-sm text-muted">
                Care coordination for clinics, patients and their doctors.
              </p>
            </div>

            <nav aria-label="Footer">
              <ul className="grid gap-2 text-sm">
                <li>
                  <a href="#who" className="text-muted transition-colors hover:text-primary">
                    Who it is for
                  </a>
                </li>
                <li>
                  <a href="#how" className="text-muted transition-colors hover:text-primary">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-muted transition-colors hover:text-primary">
                    Features
                  </a>
                </li>
                <li>
                  <Link to="/login" className="text-muted transition-colors hover:text-primary">
                    Sign in
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <p className="mt-7 border-t border-line pt-5 text-xs leading-6 text-muted">
            MedSync does not provide medical advice, diagnosis or emergency care. Always follow the
            guidance of your doctor or pharmacist. © 2026 MedSync.
          </p>
        </div>
      </footer>
    </div>
  )
}