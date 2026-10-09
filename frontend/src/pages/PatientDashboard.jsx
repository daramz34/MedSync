import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import Card, { CardBody } from '../components/ui/Card.jsx'
import { auth } from '../services/auth.js'
import { usePatientOverview } from '../hooks/usePatientOverview.js'

/* ---------- helpers ---------- */

function greetingFor(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatToday(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function formatDate(value) {
  if (!value) return '—'
  const input = String(value).slice(0, 10)
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(input) ? `${input}T00:00:00` : input)
  if (Number.isNaN(date.getTime())) return input
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function pretty(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function doctorName(doctor) {
  if (!doctor) return 'Doctor not specified'
  if (typeof doctor === 'string') return doctor
  return doctor.full_name || 'Doctor not specified'
}

/* ---------- sample data (preview only) ---------- */

const SAMPLE = {
  appointment: {
    id: 'sample',
    doctor: { full_name: 'Dr. Smith' },
    appointment_date: '2026-10-15',
    appointment_time: '10:30',
    reason: 'Follow-up consultation',
    status: 'confirmed',
  },
  medications: [
    { id: 's1', drug_name: 'Metformin 500 mg', dosage: '500 mg', frequency: 'twice_daily', reminder_time: '08:00' },
    { id: 's2', drug_name: 'Lisinopril 10 mg', dosage: '10 mg', frequency: 'daily', reminder_time: '08:00' },
  ],
  prescriptions: [
    {
      id: 's1',
      doctor: { full_name: 'Dr. A. Okafor' },
      notes: 'Allergy: Penicillin',
      created_at: '2026-09-28',
      items: [{ drug_name: 'Metformin', dosage: '500 mg', frequency: 'twice_daily', duration_days: 30 }],
    },
  ],
}

/* ---------- building blocks ---------- */

function SectionCard({ title, description, action, children }) {
  return (
    <Card className="h-full">
      <CardBody className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {action}
        </div>
        <div className="mt-4 flex-1">{children}</div>
      </CardBody>
    </Card>
  )
}

function EmptyState({ icon, title, body, action }) {
  return (
    <div className="grid h-full place-items-center rounded-xl border border-dashed border-line bg-background px-6 py-8 text-center">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary-tint text-primary">
          <Icon name={icon} size={22} />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
        <p className="mx-auto mt-1 max-w-[38ch] text-sm leading-6 text-muted">{body}</p>
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  )
}

function SectionError({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-danger-border bg-danger-tint px-4 py-5 text-center">
      <p className="text-sm font-semibold text-danger">Could not load this section</p>
      <p className="mt-1 text-sm text-ink">{message}</p>
      <div className="mt-3">
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}

function SkeletonRows({ count = 2 }) {
  return (
    <div className="grid gap-3" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-lg border border-line bg-background" />
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const value = String(status || '').toLowerCase()
  const tones = {
    pending: 'border-line bg-background text-muted',
    confirmed: 'border-primary-border bg-primary-tint text-primary',
    completed: 'border-line bg-background text-muted',
    cancelled: 'border-danger-border bg-danger-tint text-danger',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
        tones[value] || tones.pending
      }`}
    >
      {value || 'unknown'}
    </span>
  )
}

/* ---------- page ---------- */

export default function PatientDashboard() {
  const [preview, setPreview] = useState(false)
  const user = auth.getStoredUser()
  const { loading, errors, appointments, prescriptions, medications, nextAppointment, refetch } =
    usePatientOverview()

  const firstName = String(user?.full_name || 'there').trim().split(/\s+/)[0]

  const appointment = preview ? SAMPLE.appointment : nextAppointment
  const prescriptionList = preview ? SAMPLE.prescriptions : prescriptions.slice(0, 3)
  const medicationList = preview ? SAMPLE.medications : medications

  const showSkeleton = loading && !preview

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* Preview strip */}
      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-background px-4 py-3">
        <span className="text-sm font-medium text-muted">Preview only:</span>
        <button
          type="button"
          onClick={() => setPreview((value) => !value)}
          aria-pressed={preview}
          className="inline-flex h-9 items-center rounded-lg border border-primary-border bg-primary-tint px-3.5 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {preview ? 'Hide sample data' : 'Show sample data'}
        </button>
        <span className="text-sm text-muted">
          {preview
            ? 'Sample records shown below.'
            : appointments.length + prescriptions.length + medications.length === 0 && !loading
              ? 'Your account has no clinic records yet.'
              : 'Showing your real records.'}
        </span>
      </div>

      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{formatToday()}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">
            {greetingFor()}, {firstName}
          </h1>
        </div>
        <Button to="/appointments">Book appointment</Button>
      </div>

      {/* Main grid */}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="grid gap-5">
          {/* Next appointment */}
          <SectionCard
            title="Next appointment"
            description="Your soonest pending or confirmed visit"
            action={
              <Link
                to="/appointments"
                className="shrink-0 rounded-md text-sm font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                All →
              </Link>
            }
          >
            {showSkeleton ? (
              <SkeletonRows count={1} />
            ) : errors.appointments && !preview ? (
              <SectionError message={errors.appointments} onRetry={refetch} />
            ) : appointment ? (
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-line bg-surface p-5">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-tint text-primary">
                    <Icon name="calendar" size={22} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {formatDate(appointment.appointment_date)} ·{' '}
                      {String(appointment.appointment_time || '').slice(0, 5)}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {doctorName(appointment.doctor)} · {appointment.reason}
                    </p>
                  </div>
                </div>
                <StatusBadge status={appointment.status} />
              </div>
            ) : (
              <EmptyState
                icon="calendar"
                title="No upcoming appointments"
                body="When you request a visit, it appears here with its status: pending, confirmed, completed or cancelled."
                action={
                  <Button variant="secondary" size="sm" to="/appointments">
                    Request an upcoming visit
                  </Button>
                }
              />
            )}
          </SectionCard>

          {/* Medications — no dose logging exists on the backend, so this is a list, not a checklist */}
          <SectionCard
            title="Your medications"
            description="Active medications and their reminders"
            action={
              medicationList.length > 0 ? (
                <span className="shrink-0 text-right">
                  <span className="block text-2xl font-bold leading-none text-ink">
                    {medicationList.length}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">active</span>
                </span>
              ) : null
            }
          >
            {showSkeleton ? (
              <SkeletonRows count={2} />
            ) : errors.medications && !preview ? (
              <SectionError message={errors.medications} onRetry={refetch} />
            ) : medicationList.length ? (
              <ul>
                {medicationList.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 border-t border-line py-3 first:border-t-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{item.drug_name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {item.dosage} · {pretty(item.frequency)}
                      </p>
                    </div>
                    {item.reminder_time && (
                      <span className="shrink-0 text-xs font-medium text-muted">
                        Reminder {String(item.reminder_time).slice(0, 5)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="heart"
                title="No active medications"
                body="Medications from your prescriptions appear here after the pharmacy scans your QR code."
                action={
                  <Button variant="secondary" size="sm" to="/medications">
                    Go to medications
                  </Button>
                }
              />
            )}
          </SectionCard>
        </div>

        {/* Recent prescriptions */}
        <div className="grid gap-5">
          <SectionCard
            title="Recent prescriptions"
            action={
              <Link
                to="/prescriptions"
                className="shrink-0 rounded-md text-sm font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                View all →
              </Link>
            }
          >
            {showSkeleton ? (
              <SkeletonRows count={2} />
            ) : errors.prescriptions && !preview ? (
              <SectionError message={errors.prescriptions} onRetry={refetch} />
            ) : prescriptionList.length ? (
              <ul className="grid gap-3">
                {prescriptionList.map((item) => (
                  <li key={item.id} className="rounded-xl border border-line bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          Prescription #{item.id}
                        </p>
                        <p className="mt-0.5 text-sm text-muted">
                          {doctorName(item.doctor)} · Issued {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>

                    {Array.isArray(item.items) && item.items.length > 0 && (
                      <ul className="mt-2.5 space-y-1">
                        {item.items.slice(0, 3).map((drug, index) => (
                          <li key={index} className="text-sm text-muted">
                            <span className="font-medium text-ink">{drug.drug_name}</span>
                            {' · '}
                            {drug.dosage} · {pretty(drug.frequency)}
                          </li>
                        ))}
                        {item.items.length > 3 && (
                          <li className="text-xs text-muted">
                            +{item.items.length - 3} more item
                            {item.items.length - 3 === 1 ? '' : 's'}
                          </li>
                        )}
                      </ul>
                    )}

                    {item.notes && (
                      <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-background px-2.5 py-0.5 text-xs font-semibold text-danger">
                        <Icon name="alert" size={14} />
                        {item.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="prescription"
                title="No prescriptions yet"
                body="After a visit, your doctor's prescription appears here with a QR code for the pharmacy."
              />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
