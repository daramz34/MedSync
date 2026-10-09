import { useCallback, useEffect, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import Card, { CardBody } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import Modal from '../components/ui/Modal.jsx'
import { auth, api } from '../services/auth.js'
import {
  STATUS_OPTIONS,
  EDITABLE_STATUSES,
  STATUS_TONES,
} from '../lib/appointmentStatus.js'

const PAGE_LIMIT = 100
const REASON_MAX = 300

/* ---------- helpers ---------- */

function normalizeRole(value) {
  return String(value || '').toLowerCase().split('.').pop()
}

function pretty(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function firstValue(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== '') ?? ''
}

function displayPerson(value, fallback) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object') {
    return String(firstValue(value.full_name, value.name, value.username, value.id, fallback))
  }
  return fallback
}

/** Safely read a key off a possibly-nested object (row.patient may be a string). */
function nestedField(value, key) {
  if (value && typeof value === 'object') return firstValue(value[key], '')
  return ''
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

/** Local YYYY-MM-DD — never toISOString(), which is UTC. */
function todayIsoLocal(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function nowTimeLocal(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function toAppointments(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.appointments)) return response.appointments
  return []
}

function normalizeAppointment(row = {}, index = 0) {
  const rawDate = firstValue(row.appointment_date, row.date)
  const rawTime = firstValue(row.appointment_time, row.time)
  const status = String(firstValue(row.status, 'pending')).toLowerCase()

  return {
    id: firstValue(row.id, `appointment-${index}`),
    patient: displayPerson(row.patient, 'Patient'),
    doctor: displayPerson(row.doctor, 'Doctor'),
    patientEmail: String(nestedField(row.patient, 'email')),
    patientPhone: String(nestedField(row.patient, 'phone_number')),
    reason: String(firstValue(row.reason, '—')),
    notes: String(firstValue(row.notes, '')),
    date: rawDate ? String(rawDate).slice(0, 10) : '',
    time: rawTime ? String(rawTime).slice(0, 5) : '—',
    status: ['pending', 'confirmed', 'completed', 'cancelled'].includes(status)
      ? status
      : 'pending',
  }
}

/* ---------- building blocks ---------- */

const INPUT_CLASS =
  'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const LABEL_CLASS = 'block text-sm font-semibold text-ink'

function FieldError({ children }) {
  if (!children) return null
  return <p className="mt-1.5 text-sm font-medium text-danger">{children}</p>
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
        STATUS_TONES[status] || STATUS_TONES.pending
      }`}
    >
      {status}
    </span>
  )
}

function LoadingRows() {
  return (
    <div className="grid gap-3" aria-label="Loading appointments" aria-busy="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-14 animate-pulse rounded-lg border border-line bg-background" />
      ))}
    </div>
  )
}

function ErrorState({ title, message, onRetry }) {
  return (
    <div className="rounded-xl border border-danger-border bg-danger-tint px-5 py-6 text-center">
      <p className="text-sm font-semibold text-danger">{title}</p>
      <p className="mx-auto mt-1 max-w-[42ch] text-sm text-ink">
        {message || 'Please check your connection and try again.'}
      </p>
      <div className="mt-4 flex justify-center">
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}

function EmptyState({ isPatient }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line bg-background px-6 py-10 text-center">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary-tint text-primary">
          <Icon name="calendar" size={22} />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-ink">No appointments yet</h3>
        <p className="mx-auto mt-1 max-w-[42ch] text-sm leading-6 text-muted">
          {isPatient
            ? 'Request a visit with the form above and it will appear here as pending.'
            : 'When a patient books a visit with you, it appears here for confirmation.'}
        </p>
      </div>
    </div>
  )
}

function Notice({ tone = 'success', children }) {
  const styles =
    tone === 'danger'
      ? 'border-danger-border bg-danger-tint text-danger'
      : 'border-primary-border bg-primary-tint text-primary'

  return (
    <p
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`rounded-lg border px-3.5 py-2.5 text-sm font-medium ${styles}`}
    >
      {children}
    </p>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line py-3 first:border-t-0 first:pt-0">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-ink">{children}</dd>
    </div>
  )
}

/* ---------- booking form (patients) ---------- */

function BookingForm({ doctors, doctorsLoading, doctorsError, onBooked, onRetryDoctors }) {
  const [values, setValues] = useState({
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
  })
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const today = todayIsoLocal()
  const noDoctors = !doctorsLoading && !doctorsError && doctors.length === 0

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '', form: '' }))
    setNotice('')
  }

  async function onSubmit(event) {
    event.preventDefault()
    setNotice('')

    const next = {}
    if (!values.doctor_id) next.doctor_id = 'Choose a doctor.'
    if (!values.appointment_date) next.appointment_date = 'Choose a date.'
    else if (values.appointment_date < today) next.appointment_date = 'Choose today or a later date.'
    if (!values.appointment_time) next.appointment_time = 'Choose a time.'
    else if (values.appointment_date === today && values.appointment_time <= nowTimeLocal()) {
      next.appointment_time = 'Choose a time later today.'
    }

    const reason = values.reason.trim()
    if (!reason) next.reason = 'Tell the clinic briefly why you would like a visit.'
    else if (reason.length > REASON_MAX) next.reason = `Keep this under ${REASON_MAX} characters.`

    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      // POST /appointments/ — AppointmentCreate is exactly these four keys.
      const created = await api.post(
        '/appointments/',
        {
          doctor_id: Number(values.doctor_id),
          reason,
          appointment_date: values.appointment_date,
          appointment_time: values.appointment_time,
        },
        { auth: true },
      )

      setValues({ doctor_id: '', appointment_date: '', appointment_time: '', reason: '' })
      setNotice(
        `Request sent — status is ${String(created?.status || 'pending').toLowerCase()}. The doctor will confirm it.`,
      )
      onBooked?.()
    } catch (err) {
      setErrors({ form: err?.message || 'Could not book this appointment.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardBody>
        <h2 className="text-base font-semibold text-ink">Request an appointment</h2>
        <p className="mt-0.5 text-sm text-muted">
          Choose a doctor, a preferred date and tell the clinic briefly why you would like a visit.
        </p>

        {doctorsError && (
          <div className="mt-5">
            <ErrorState
              title="Could not load doctors"
              message={doctorsError}
              onRetry={onRetryDoctors}
            />
          </div>
        )}

        {noDoctors && (
          <div className="mt-5">
            <Notice tone="danger">
              The clinic has not added any doctors yet, so booking is unavailable.
            </Notice>
          </div>
        )}

        {notice && (
          <div className="mt-5">
            <Notice>{notice}</Notice>
          </div>
        )}

        <form onSubmit={onSubmit} noValidate className="mt-5 grid gap-5">
          <div>
            <label htmlFor="doctor_id" className={LABEL_CLASS}>
              Doctor <span className="text-danger">*</span>
            </label>
            <select
              id="doctor_id"
              value={values.doctor_id}
              onChange={(event) => update('doctor_id', event.target.value)}
              disabled={doctorsLoading || noDoctors || busy}
              className={`mt-1.5 ${INPUT_CLASS}`}
            >
              <option value="">{doctorsLoading ? 'Loading doctors…' : 'Select a doctor'}</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {displayPerson(doctor, 'Doctor')}
                  {doctor.specialization ? ` — ${pretty(doctor.specialization)}` : ''}
                </option>
              ))}
            </select>
            <FieldError>{errors.doctor_id}</FieldError>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="appointment_date" className={LABEL_CLASS}>
                Preferred date <span className="text-danger">*</span>
              </label>
              <input
                id="appointment_date"
                type="date"
                min={today}
                value={values.appointment_date}
                onChange={(event) => update('appointment_date', event.target.value)}
                disabled={busy}
                className={`mt-1.5 ${INPUT_CLASS}`}
              />
              <FieldError>{errors.appointment_date}</FieldError>
            </div>

            <div>
              <label htmlFor="appointment_time" className={LABEL_CLASS}>
                Preferred time <span className="text-danger">*</span>
              </label>
              <input
                id="appointment_time"
                type="time"
                value={values.appointment_time}
                onChange={(event) => update('appointment_time', event.target.value)}
                disabled={busy}
                className={`mt-1.5 ${INPUT_CLASS}`}
              />
              <FieldError>{errors.appointment_time}</FieldError>
            </div>
          </div>

          <div>
            <label htmlFor="reason" className={LABEL_CLASS}>
              Reason for visit <span className="text-danger">*</span>
            </label>
            <textarea
              id="reason"
              rows={3}
              maxLength={REASON_MAX}
              value={values.reason}
              onChange={(event) => update('reason', event.target.value)}
              placeholder="e.g. Persistent headache for the past week."
              disabled={busy}
              className={`mt-1.5 resize-none ${INPUT_CLASS}`}
            />
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <FieldError>{errors.reason}</FieldError>
              <span className="ml-auto text-xs text-muted">
                {values.reason.length}/{REASON_MAX}
              </span>
            </div>
          </div>

          {errors.form && <Notice tone="danger">{errors.form}</Notice>}

          <div>
            <Button type="submit" loading={busy} disabled={busy || doctorsLoading || noDoctors}>
              {busy ? 'Sending…' : 'Request appointment'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

/* ---------- prescription summary (inside the modal) ---------- */

function PrescriptionSummary({ prescription, checking, error, onRetry }) {
  if (checking) {
    return <p className="mt-3 text-sm text-muted">Checking for a prescription…</p>
  }

  if (error) {
    return (
      <div className="mt-3">
        <Notice tone="danger">{error}</Notice>
        <div className="mt-2">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry check
          </Button>
        </div>
      </div>
    )
  }

  if (!prescription) {
    return (
      <p className="mt-3 text-sm text-muted">
        No prescription has been issued for this visit yet.
      </p>
    )
  }

  const items = Array.isArray(prescription.items) ? prescription.items : []
  const revoked = Boolean(prescription.qr_revoked_at)

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          Prescription #{prescription.id}
          {prescription.created_at ? ` · ${formatDate(prescription.created_at)}` : ''}
        </p>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            revoked
              ? 'border-danger-border bg-danger-tint text-danger'
              : 'border-primary-border bg-primary-tint text-primary'
          }`}
        >
          {revoked ? 'QR revoked' : 'QR active'}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">This prescription has no items.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {items.map((item, index) => (
            <li
              key={item.id ?? index}
              className="rounded-lg border border-line bg-background px-3.5 py-2.5"
            >
              <p className="text-sm font-semibold text-ink">{item.drug_name || '—'}</p>
              <p className="mt-0.5 text-xs text-muted">
                {item.dosage || '—'} · {pretty(item.frequency)}
                {item.duration_days
                  ? ` · ${item.duration_days} day${String(item.duration_days) === '1' ? '' : 's'}`
                  : ''}
              </p>
              {item.instructions && (
                <p className="mt-1 text-xs text-muted">{item.instructions}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {prescription.notes && (
        <p className="mt-3 text-sm text-muted">
          <span className="font-semibold text-ink">Prescription notes: </span>
          {prescription.notes}
        </p>
      )}
    </div>
  )
}

/* ---------- appointment modal: manage (doctors) + read-only view ---------- */

function AppointmentModal({ target, onClose, onSaved }) {
  const [draftStatus, setDraftStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [checkingPrescription, setCheckingPrescription] = useState(true)
  const [prescription, setPrescription] = useState(null)
  const [prescriptionError, setPrescriptionError] = useState('')

  const options = STATUS_OPTIONS[target?.status] || []
  const canEdit = EDITABLE_STATUSES.includes(target?.status)
  const prescriptionExists = Boolean(prescription)

  const loadPrescription = useCallback(async () => {
    if (!target) return
    setCheckingPrescription(true)
    setPrescriptionError('')
    try {
      const found = await api.get(`/appointments/${target.id}/prescription`, { auth: true })
      setPrescription(found || null)
    } catch (err) {
      setPrescription(null)
      // 404 means "none yet" — only surface real failures.
      if (err?.status !== 404) {
        setPrescriptionError(err?.message || 'Could not check for a prescription.')
      }
    } finally {
      setCheckingPrescription(false)
    }
  }, [target])

  useEffect(() => {
    setDraftStatus('')
    setError('')
    setSaving(false)
    setPrescription(null)
    loadPrescription()
  }, [loadPrescription])

  async function save() {
    if (!target || !draftStatus) return
    setSaving(true)
    setError('')
    try {
      await api.patch(`/appointments/${target.id}`, { status: draftStatus }, { auth: true })

      // Confirming/cancelling changes which visits appear in /prescriptions.
      window.dispatchEvent(new CustomEvent('medsync:prescriptions-changed'))

      onSaved?.(target.id, draftStatus)
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Could not update this appointment.')
    } finally {
      setSaving(false)
    }
  }

  if (!target) return null

  const picked = options.find((option) => option.value === draftStatus)
  const blocked =
    !draftStatus ||
    checkingPrescription ||
    Boolean(prescriptionError) ||
    (picked?.needsPrescription && !prescriptionExists)

  return (
    <Modal
      open
      onClose={onClose}
      title={canEdit ? 'Manage appointment' : 'Appointment details'}
      description={`${target.patient} · ${formatDate(target.date)} at ${target.time}`}
      footer={
        canEdit ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button loading={saving} disabled={blocked || saving} onClick={save}>
              Save status
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      <dl>
        <DetailRow label="Patient">{target.patient}</DetailRow>
        <DetailRow label="Date">{formatDate(target.date)}</DetailRow>
        <DetailRow label="Time">{target.time}</DetailRow>
        <DetailRow label="Reason">{target.reason}</DetailRow>
        <DetailRow label="Current status">
          <StatusBadge status={target.status} />
        </DetailRow>
        {target.patientEmail && <DetailRow label="Email">{target.patientEmail}</DetailRow>}
        {target.patientPhone && <DetailRow label="Phone">{target.patientPhone}</DetailRow>}
        {target.notes && (
          <DetailRow label="Notes">
            <span className="font-normal text-muted">{target.notes}</span>
          </DetailRow>
        )}
      </dl>

      {/* Prescription — shown in both modes so a closed visit is still inspectable */}
      <div className="mt-5 border-t border-line pt-5">
        <h3 className="text-sm font-semibold text-ink">Prescription</h3>
        <PrescriptionSummary
          prescription={prescription}
          checking={checkingPrescription}
          error={prescriptionError}
          onRetry={loadPrescription}
        />
      </div>

      {/* Status controls — editable visits only */}
      <div className="mt-5 border-t border-line pt-5">
        {canEdit ? (
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Choose a new status</legend>
            <p className="mt-0.5 text-sm text-muted">
              Only the transitions the clinic allows are listed.
            </p>

            <div className="mt-3 grid gap-2">
              {options.map((option) => {
                const needsPrescription = Boolean(option.needsPrescription)
                const optionBlocked =
                  needsPrescription && (!prescriptionExists || checkingPrescription)
                return (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors ${
                      optionBlocked
                        ? 'cursor-not-allowed border-line bg-background opacity-70'
                        : draftStatus === option.value
                          ? 'cursor-pointer border-primary-border bg-primary-tint'
                          : 'cursor-pointer border-line bg-surface hover:border-primary-border'
                    }`}
                  >
                    <input
                      type="radio"
                      name="appointment-status"
                      value={option.value}
                      checked={draftStatus === option.value}
                      disabled={optionBlocked || saving}
                      onChange={() => {
                        setDraftStatus(option.value)
                        setError('')
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{option.label}</span>
                      {needsPrescription && (
                        <span className="mt-0.5 block text-xs text-muted">
                          {checkingPrescription
                            ? 'Checking prescription…'
                            : prescriptionExists
                              ? 'This visit already has a prescription.'
                              : 'Issue a prescription first — this visit has none yet.'}
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ) : (
          <Notice>
            {target.status === 'completed'
              ? 'This visit is completed — its status is final.'
              : 'This visit was cancelled — its status is final.'}
          </Notice>
        )}

        {error && (
          <div className="mt-3">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ---------- page ---------- */

export default function AppointmentsPage() {
  const user = auth.getStoredUser()
  const role = normalizeRole(user?.role)
  const isPatient = role === 'patient'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [doctors, setDoctors] = useState([])
  const [doctorsLoading, setDoctorsLoading] = useState(isPatient)
  const [doctorsError, setDoctorsError] = useState('')

  const [modalTarget, setModalTarget] = useState(null)

  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [actionNotice, setActionNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/appointments/?page=1&limit=${PAGE_LIMIT}`, { auth: true })
      setRows(toAppointments(response))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true)
    setDoctorsError('')
    try {
      // DoctorList = { doctors: [...], total, page, limit }
      const first = await api.get(`/appointments/doctors?page=1&limit=${PAGE_LIMIT}`)
      const firstRows = Array.isArray(first?.doctors) ? first.doctors : []
      const total = Number(first?.total) || firstRows.length

      if (firstRows.length >= total) {
        setDoctors(firstRows)
        return
      }

      const pageCount = Math.ceil(total / PAGE_LIMIT)
      const rest = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) =>
          api
            .get(`/appointments/doctors?page=${index + 2}&limit=${PAGE_LIMIT}`)
            .then((page) => (Array.isArray(page?.doctors) ? page.doctors : [])),
        ),
      )
      setDoctors(firstRows.concat(...rest))
    } catch (err) {
      setDoctors([])
      setDoctorsError(err?.message || 'Could not load the list of doctors.')
    } finally {
      setDoctorsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isPatient) loadDoctors()
  }, [isPatient, loadDoctors])

  /** A doctor saved a new status — patch the row in place, no full refetch. */
  function handleStatusSaved(id, status) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)))
    setActionNotice('Appointment status updated.')
  }

  function openCancel(row) {
    setCancelTarget(row)
    setCancelError('')
  }

  function closeCancel() {
    setCancelTarget(null)
    setCancelError('')
    setCancelling(false)
  }

  /** DELETE /appointments/{id} — 204, and the backend emails the doctor. */
  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    setCancelError('')
    try {
      await api.delete(`/appointments/${cancelTarget.id}`, { auth: true })
      setActionNotice('Your appointment request was cancelled.')
      closeCancel()
      load()
    } catch (err) {
      setCancelError(
        err?.status === 404
          ? 'That appointment was not found, or it can no longer be cancelled.'
          : err?.message || 'Could not cancel this appointment.',
      )
      setCancelling(false)
    }
  }

  const appointments = rows.map(normalizeAppointment)
  const patientCanCancel = (row) => row.status === 'pending' || row.status === 'confirmed'
  const doctorCanManage = (row) => EDITABLE_STATUSES.includes(row.status)

  const columns = [
    { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
    { key: 'time', header: 'Time' },
    isPatient
      ? { key: 'doctor', header: 'Doctor', render: (row) => row.doctor }
      : { key: 'patient', header: 'Patient', render: (row) => row.patient },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        isPatient ? (
          patientCanCancel(row) ? (
            <Button variant="ghost" size="sm" onClick={() => openCancel(row)}>
              Cancel
            </Button>
          ) : null
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setModalTarget(row)}>
            {doctorCanManage(row) ? 'Manage' : 'View'}
          </Button>
        ),
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Appointments</h1>
        <p className="mt-1 text-sm text-muted">
          {isPatient
            ? 'Request a visit and follow the status of your requests.'
            : 'Visits booked with you — open Manage to confirm, complete or cancel, or View a closed visit.'}
        </p>
      </div>

      {isPatient && (
        <div className="mt-6">
          <BookingForm
            doctors={doctors}
            doctorsLoading={doctorsLoading}
            doctorsError={doctorsError}
            onRetryDoctors={loadDoctors}
            onBooked={() => {
              setActionNotice('')
              load()
            }}
          />
        </div>
      )}

      {actionNotice && (
        <div className="mt-5">
          <Notice>{actionNotice}</Notice>
        </div>
      )}

      <Card className="mt-6">
        <CardBody>
          <h2 className="text-base font-semibold text-ink">
            {isPatient ? 'Your appointments' : 'Appointments booked with you'}
          </h2>

          <div className="mt-5">
            {loading ? (
              <LoadingRows />
            ) : error ? (
              <ErrorState
                title="Could not load appointments"
                message={error.message}
                onRetry={load}
              />
            ) : appointments.length === 0 ? (
              <EmptyState isPatient={isPatient} />
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table
                    columns={columns}
                    rows={appointments}
                    rowKey={(row) => row.id}
                    emptyMessage="No appointments."
                  />
                </div>

                <ul className="grid gap-3 sm:hidden">
                  {appointments.map((row) => (
                    <li key={row.id} className="rounded-xl border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">
                            {formatDate(row.date)} · {row.time}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {isPatient ? row.doctor : row.patient}
                          </p>
                        </div>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="mt-2 text-sm text-muted">{row.reason}</p>

                      {isPatient && patientCanCancel(row) && (
                        <div className="mt-3">
                          <Button variant="secondary" size="sm" onClick={() => openCancel(row)}>
                            Cancel request
                          </Button>
                        </div>
                      )}

                      {!isPatient && (
                        <div className="mt-3">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setModalTarget(row)}
                          >
                            {doctorCanManage(row) ? 'Manage' : 'View'}
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ---------- Doctor: manage / view ---------- */}
      {modalTarget && (
        <AppointmentModal
          target={modalTarget}
          onClose={() => setModalTarget(null)}
          onSaved={handleStatusSaved}
        />
      )}

      {/* ---------- Patient: cancel ---------- */}
      <Modal
        open={Boolean(cancelTarget)}
        onClose={closeCancel}
        title="Cancel this appointment?"
        description={
          cancelTarget
            ? `${formatDate(cancelTarget.date)} at ${cancelTarget.time} with ${cancelTarget.doctor}`
            : ''
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeCancel} disabled={cancelling}>
              Keep it
            </Button>
            <Button variant="danger" loading={cancelling} onClick={confirmCancel}>
              Cancel appointment
            </Button>
          </>
        }
      >
        {cancelError && <Notice tone="danger">{cancelError}</Notice>}
        <p className="text-sm text-muted">
          The clinic will be told this visit was cancelled. You can book a new one at any time.
        </p>
      </Modal>
    </div>
  )
}
