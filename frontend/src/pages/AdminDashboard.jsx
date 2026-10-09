import { useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import Card, { CardBody } from '../components/ui/Card.jsx'
import Field from '../components/ui/Field.jsx'
import PasswordField from '../components/ui/PasswordField.jsx'
import Table from '../components/ui/Table.jsx'
import { api } from '../services/api.js'

const SAMPLE_PENDING = [
  { id: 101, full_name: 'Ada Okoro', email: 'ada.okoro@example.com', created_at: '2026-10-02' },
  { id: 102, full_name: 'Musa Bello', email: 'musa.bello@example.com', created_at: '2026-10-03' },
]

const EMPTY_DOCTOR = {
  username: '',
  full_name: '',
  email: '',
  phone_number: '',
  password: '',
  specialization: '',
}

function StatCard({ label, value, icon, note }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
            <p className="mt-1 text-xs text-muted">{note}</p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-tint text-primary">
            <Icon name={icon} size={20} />
          </span>
        </div>
      </CardBody>
    </Card>
  )
}

function Notice({ children, error = false }) {
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`rounded-lg border px-3.5 py-2.5 text-sm ${
        error
          ? 'border-danger-border bg-danger-tint text-danger'
          : 'border-primary-border bg-primary-tint text-primary'
      }`}
    >
      {children}
    </p>
  )
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export default function AdminDashboard() {
  const [preview, setPreview] = useState(false)
  const [doctor, setDoctor] = useState(EMPTY_DOCTOR)
  const [doctorError, setDoctorError] = useState('')
  const [doctorNotice, setDoctorNotice] = useState('')
  const [creatingDoctor, setCreatingDoctor] = useState(false)

  const pendingPatients = preview ? SAMPLE_PENDING : []

  function updateDoctor(event) {
    const { name, value } = event.target
    setDoctor((current) => ({ ...current, [name]: value }))
    setDoctorError('')
    setDoctorNotice('')
  }

  async function createDoctor(event) {
    event.preventDefault()
    setDoctorError('')
    setDoctorNotice('')

    const payload = {
      username: doctor.username.trim(),
      full_name: doctor.full_name.trim(),
      email: doctor.email.trim(),
      phone_number: doctor.phone_number.trim(),
      password: doctor.password,
      specialization: doctor.specialization.trim(),
    }

    setCreatingDoctor(true)
    try {
      await api.post('/auth/register/doctor', payload, { auth: true })
      setDoctorNotice('Doctor account created. A welcome email has been sent.')
      setDoctor(EMPTY_DOCTOR)
    } catch (error) {
      setDoctorError(error?.message || 'Could not create the doctor account.')
    } finally {
      setCreatingDoctor(false)
    }
  }

  const pendingColumns = [
    { key: 'full_name', header: 'Patient' },
    { key: 'email', header: 'Email' },
    { key: 'created_at', header: 'Registered', render: (row) => formatDate(row.created_at) },
    {
      key: 'verification',
      header: 'Verification',
      render: () => <span className="text-sm text-muted">Not connected</span>,
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-background px-4 py-3">
        <span className="text-sm font-medium text-muted">Preview only:</span>
        <button
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview((value) => !value)}
          className="inline-flex h-9 items-center rounded-lg border border-primary-border bg-primary-tint px-3.5 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {preview ? 'Hide sample data' : 'Show sample data'}
        </button>
        <span className="text-sm text-muted">
          {preview
            ? 'Sample admin data is shown.'
            : 'Live clinic statistics are not connected yet.'}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Admin dashboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage clinic accounts and review clinic activity.
        </p>
      </div>

      <section
        aria-label="Clinic overview"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard label="Patients" value={preview ? '128' : '—'} icon="user" note={preview ? 'Sample count' : 'Not connected'} />
        <StatCard label="Doctors" value={preview ? '12' : '—'} icon="stethoscope" note={preview ? 'Sample count' : 'Not connected'} />
        <StatCard label="Appointments" value={preview ? '34' : '—'} icon="calendar" note={preview ? 'This month, sample data' : 'Not connected'} />
        <StatCard label="Prescriptions" value={preview ? '21' : '—'} icon="prescription" note={preview ? 'This month, sample data' : 'Not connected'} />
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold text-ink">Create doctor account</h2>
            <p className="mt-1 text-sm text-muted">
              The doctor receives a welcome email with sign-in instructions.
            </p>

            <form onSubmit={createDoctor} noValidate className="mt-5 grid gap-4">
              <Field id="doctor-full-name" name="full_name" label="Full name" value={doctor.full_name} onChange={updateDoctor} required />
              <Field id="doctor-username" name="username" label="Username" value={doctor.username} onChange={updateDoctor} required />
              <Field id="doctor-email" name="email" type="email" label="Email address" value={doctor.email} onChange={updateDoctor} required />
              <Field id="doctor-phone" name="phone_number" type="tel" label="Phone number" value={doctor.phone_number} onChange={updateDoctor} required />
              <Field
                id="doctor-specialization"
                name="specialization"
                label="Specialization"
                value={doctor.specialization}
                onChange={updateDoctor}
                hint="Must match a value your backend Specialization enum accepts."
                required
              />
              <PasswordField
                id="doctor-password"
                name="password"
                label="Temporary password"
                value={doctor.password}
                onChange={updateDoctor}
                required
              />

              {doctorError && <Notice error>{doctorError}</Notice>}
              {doctorNotice && <Notice>{doctorNotice}</Notice>}

              <div>
                <Button type="submit" loading={creatingDoctor}>
                  {creatingDoctor ? 'Creating account…' : 'Create doctor account'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Pending verification</h2>
                <p className="mt-1 text-sm text-muted">
                  Patients awaiting a clinic identity check.
                </p>
              </div>
              <span className="rounded-full border border-line bg-background px-2.5 py-1 text-xs font-semibold text-muted">
                {preview ? pendingPatients.length : '—'}
              </span>
            </div>

            <div className="mt-5 rounded-lg border border-line bg-background p-3 text-sm text-muted">
              Patient verification is not connected yet. No verify action is shown until the
              admin endpoint is confirmed.
            </div>

            {!preview ? (
              <div className="mt-4 rounded-xl border border-dashed border-line px-5 py-8 text-center">
                <h3 className="text-sm font-semibold text-ink">
                  Pending patient list unavailable
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Connect the admin pending-patients endpoint to display live records.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 hidden sm:block">
                  <Table
                    columns={pendingColumns}
                    rows={pendingPatients}
                    rowKey={(row) => row.id}
                    emptyMessage="No patients are awaiting verification."
                  />
                </div>
                <ul className="mt-5 grid gap-3 sm:hidden">
                  {pendingPatients.map((patient) => (
                    <li key={patient.id} className="rounded-xl border border-line bg-surface p-4">
                      <p className="text-sm font-semibold text-ink">{patient.full_name}</p>
                      <p className="mt-1 break-words text-sm text-muted">{patient.email}</p>
                      <p className="mt-2 text-xs text-muted">
                        Registered {formatDate(patient.created_at)}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-3 w-full"
                        disabled
                      >
                        Verification unavailable
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
