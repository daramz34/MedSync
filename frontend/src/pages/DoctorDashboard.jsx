import { useCallback, useEffect, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import Card, { CardBody } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import Modal from '../components/ui/Modal.jsx'
import { auth, api } from '../services/auth.js'
import PrescriptionSection from '../components/prescriptions/PrescriptionSection.jsx'


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

/** Local YYYY-MM-DD — must match the API's date format. */
function todayIso(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

/**
 * GET /appointments/ returns PaginatedAppointmentResponse:
 *   { total, page, limit, results: [...] }
 */
function toList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.appointments)) return response.appointments
  return []
}

function normalizeAppointment(row = {}, index = 0) {
  const rawDate = firstValue(row.appointment_date, row.date, row.scheduled_at)
  const rawTime = firstValue(row.appointment_time, row.time, row.scheduled_time)
  const status = String(firstValue(row.status, 'pending')).toLowerCase()

  return {
    id: firstValue(row.id, row.appointment_id, `appointment-${index}`),
    patient: displayPerson(firstValue(row.patient, row.patient_name), 'Patient'),
    doctor: displayPerson(firstValue(row.doctor, row.doctor_name), 'Doctor'),
    date: rawDate ? String(rawDate).slice(0, 10) : '',
    time: rawTime ? String(rawTime).slice(0, 5) : '—',
    reason: String(firstValue(row.reason, row.description, '—')),
    notes: String(firstValue(row.notes, '')),
    status: ['pending', 'confirmed', 'completed', 'cancelled'].includes(status)
      ? status
      : 'pending',
  }
}

/**
 * The ONLY status transitions the backend accepts from a doctor.
 *   pending   → confirmed | cancelled
 *   confirmed → completed (needs a prescription) | cancelled
 *   completed / cancelled → final, no edit
 */
const STATUS_OPTIONS = {
  pending: [
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
  confirmed: [
    { value: 'completed', label: 'Completed', needsPrescription: true },
    { value: 'cancelled', label: 'Cancelled' },
  ],
}

const EDITABLE_STATUSES = Object.keys(STATUS_OPTIONS)

/**
 * Frequency suggestions only — the backend uses enums.Frequency.
 * Run:  Select-String .\enums.py -Pattern 'class Frequency' -Context 0,12
 * until you know the exact members, then swap this for a strict <select>.
 */
const FREQUENCY_SUGGESTIONS = [
  'once_daily',
  'twice_daily',
  'thrice_daily',
  'weekly',
  'as_needed',
]

/**
 * Catches a bare number like "500" that's missing its unit.
 * Warning only — "2" and "0.5" are legitimate dosages, so never block submit.
 */
const BARE_NUMBER = /^\d+(?:\.\d+)?$/

/* ---------- sample data for preview mode ---------- */

const SAMPLE_APPOINTMENTS = [
  {
    id: 'sample-1',
    patient_name: 'Ada Okoro',
    appointment_date: '2026-10-15',
    appointment_time: '10:30',
    reason: 'Follow-up consultation',
    notes: 'Patient reports improved sleep.',
    status: 'confirmed',
  },
  {
    id: 'sample-2',
    patient_name: 'Musa Bello',
    appointment_date: '2026-10-16',
    appointment_time: '09:00',
    reason: 'General consultation',
    status: 'pending',
  },
  {
    id: 'sample-3',
    patient_name: 'Chioma Eze',
    appointment_date: '2026-10-17',
    appointment_time: '14:00',
    reason: 'Medication review',
    status: 'completed',
  },
  {
    id: 'sample-4',
    patient_name: 'Tunde Adeyemi',
    appointment_date: '2026-10-18',
    appointment_time: '11:30',
    reason: 'Routine check-up',
    status: 'cancelled',
  },
]

/* ---------- building blocks ---------- */

function StatTile({ label, value, icon, note }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-bold leading-none text-ink">{value}</p>
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

function StatusBadge({ status }) {
  const tones = {
    pending: 'border-line bg-background text-muted',
    confirmed: 'border-primary-border bg-primary-tint text-primary',
    completed: 'border-line bg-background text-muted',
    cancelled: 'border-danger-border bg-danger-tint text-danger',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
        tones[status] || tones.pending
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

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-danger-border bg-danger-tint px-5 py-6 text-center">
      <p className="text-sm font-semibold text-danger">Could not load appointments</p>
      <p className="mt-1 text-sm text-ink">
        {message || 'Please check your connection and try again.'}
      </p>
      <div className="mt-4">
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line bg-background px-6 py-10 text-center">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary-tint text-primary">
          <Icon name="calendar" size={22} />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-ink">No appointment requests</h3>
        <p className="mx-auto mt-1 max-w-[42ch] text-sm leading-6 text-muted">
          When a patient books a visit with you, the request appears here for confirmation.
        </p>
      </div>
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line py-3 first:border-t-0 first:pt-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{children}</dd>
    </div>
  )
}

const INPUT_CLASS =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function emptyItem() {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    drug_name: '',
    dosage: '',
    frequency: '',
    duration_days: '7',
    instructions: '',
  }
}



/* ---------- page ---------- */

export default function DoctorDashboard() {
  const [preview, setPreview] = useState(false)
  const [selected, setSelected] = useState(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')

  /* ---- prescription for the selected visit (single fetch, owned here) ---- */
  const [prescription, setPrescription] = useState(null)
  const [checkingPrescription, setCheckingPrescription] = useState(false)
  const [prescriptionError, setPrescriptionError] = useState('')

  /* ---- status edit sub-state ---- */
  const [isEditing, setIsEditing] = useState(false)
  const [draftStatus, setDraftStatus] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')

  /* ---- appointments in plain state so we can update them directly ---- */
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/appointments/?page=1&limit=100', { auth: true })
      setRows(toList(response))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /** GET /appointments/{id}/prescription — 404 means "none yet". */
  const loadPrescription = useCallback(async () => {
    if (!selected || preview) {
      setPrescription(null)
      setCheckingPrescription(false)
      setPrescriptionError('')
      return
    }

    setCheckingPrescription(true)
    setPrescriptionError('')
    try {
      const existing = await api.get(`/appointments/${selected.id}/prescription`, {
        auth: true,
      })
      setPrescription(existing)
    } catch (err) {
      if (err?.status === 404) {
        setPrescription(null)
      } else {
        setPrescription(null)
        setPrescriptionError(err?.message || 'Could not check for an existing prescription.')
      }
    } finally {
      setCheckingPrescription(false)
    }
  }, [selected, preview])

  useEffect(() => {
    loadPrescription()
  }, [loadPrescription])

  const user = auth.getStoredUser()
  const lastName = String(user?.full_name || '').trim().split(/\s+/).pop() || 'Doctor'

  const appointments = preview
    ? SAMPLE_APPOINTMENTS.map(normalizeAppointment)
    : rows.map(normalizeAppointment)

  const pendingCount = appointments.filter((row) => row.status === 'pending').length
  const completedCount = appointments.filter((row) => row.status === 'completed').length
  const today = todayIso()
  const todaySchedule = appointments.filter(
    (row) => row.status === 'confirmed' && row.date === today,
  )

  function openDetails(row) {
    setSelected(row)
    setNotesDraft(row.notes || '')
    setActionError('')
    setBusy('')
    setIsEditing(false)
    setDraftStatus('')
    setStatusError('')
  }

  function closeDetails() {
    setSelected(null)
    setNotesDraft('')
    setActionError('')
    setBusy('')
    setPrescription(null)
    setCheckingPrescription(false)
    setPrescriptionError('')
    setIsEditing(false)
    setDraftStatus('')
    setStatusError('')
  }

  function startEdit() {
    setIsEditing(true)
    setDraftStatus('')
    setStatusError('')
  }

  function cancelEdit() {
    setIsEditing(false)
    setDraftStatus('')
    setStatusError('')
  }

  /**
   * A prescription was created or its QR revoked. Update local state, tell
   * /prescriptions to reload its tabs, and refresh the appointment list.
   */
  function handlePrescriptionChanged(updated) {
    if (updated) setPrescription(updated)
    else loadPrescription()

    window.dispatchEvent(new CustomEvent('medsync:prescriptions-changed'))
    load()
  }

  /** PATCH /appointments/{id} { status } — only sends a value from STATUS_OPTIONS. */
  async function saveStatus() {
    if (!selected || preview || !draftStatus) return

    setSavingStatus(true)
    setStatusError('')

    try {
      const updated = await api.patch(
        `/appointments/${selected.id}`,
        { status: draftStatus },
        { auth: true },
      )

      setRows((current) =>
        current.map((row) =>
          row.id === selected.id ? { ...row, ...updated, id: row.id } : row,
        ),
      )

      setSelected((current) =>
        current ? { ...current, ...updated, id: current.id, status: draftStatus } : current,
      )

      setIsEditing(false)
      setDraftStatus('')

      // Confirming a visit is what makes it show up in /prescriptions → Awaiting.
      window.dispatchEvent(new CustomEvent('medsync:prescriptions-changed'))
    } catch (err) {
      setStatusError(err?.message || 'Could not update this appointment.')
    } finally {
      setSavingStatus(false)
    }
  }

  /** PATCH /appointments/{id} { notes } */
  async function saveNotes() {
    if (!selected || preview) return
    setBusy('notes')
    setActionError('')
    try {
      const updated = await api.patch(
        `/appointments/${selected.id}`,
        { notes: notesDraft },
        { auth: true },
      )
      setRows((current) =>
        current.map((row) =>
          row.id === selected.id ? { ...row, ...updated, id: row.id } : row,
        ),
      )
      setSelected((current) => (current ? { ...current, notes: notesDraft } : current))
    } catch (err) {
      setActionError(err?.message || 'Could not save notes.')
    } finally {
      setBusy('')
    }
  }

  const columns = [
    { key: 'patient', header: 'Patient' },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
    { key: 'time', header: 'Time' },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => openDetails(row)}>
          View
        </Button>
      ),
    },
  ]

  const canEdit = EDITABLE_STATUSES.includes(selected?.status)
  const options = STATUS_OPTIONS[selected?.status] || []
  const prescriptionExists = Boolean(prescription)

  // Only confirmed/completed visits can carry a prescription.
  const canPrescribe =
    !preview && (selected?.status === 'confirmed' || selected?.status === 'completed')

  const pickedOption = options.find((option) => option.value === draftStatus)
  const saveBlocked = !draftStatus || (pickedOption?.needsPrescription && !prescriptionExists)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10">
      {/* Preview strip */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-background px-4 py-3">
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
            ? 'Sample appointments — editing is disabled.'
            : 'Showing appointments from your account.'}
        </span>
      </div>

      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{formatToday()}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {greetingFor()}, Dr. {lastName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-primary-border bg-primary-tint px-2.5 py-0.5 text-xs font-semibold text-primary">
              Doctor
            </span>
            {user?.specialization && (
              <span className="text-sm text-muted">{pretty(user.specialization)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <section
        aria-label="Your activity"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatTile
          label="Appointments"
          value={appointments.length}
          icon="calendar"
          note={preview ? 'Sample data' : 'From your account'}
        />
        <StatTile
          label="Pending requests"
          value={pendingCount}
          icon="clipboard"
          note="Awaiting your confirmation"
        />
        <StatTile label="Completed" value={completedCount} icon="check" note="Marked as completed" />
        <StatTile
          label="Today"
          value={todaySchedule.length}
          icon="activity"
          note="Confirmed visits today"
        />
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Appointment requests */}
        <Card className="h-full">
          <CardBody>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Appointment requests</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Open a visit, then use Edit to change its status.
                </p>
              </div>
            </div>

            <div className="mt-5">
              {!preview && loading ? (
                <LoadingRows />
              ) : !preview && error ? (
                <ErrorState message={error.message} onRetry={load} />
              ) : appointments.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <div className="hidden sm:block">
                    <Table
                      columns={columns}
                      rows={appointments}
                      rowKey={(row) => row.id}
                      emptyMessage="No appointment requests."
                    />
                  </div>

                  <ul className="grid gap-3 sm:hidden">
                    {appointments.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => openDetails(row)}
                          className="w-full rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-primary-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink">{row.patient}</p>
                              <p className="mt-1 text-sm text-muted">
                                {formatDate(row.date)} · {row.time}
                              </p>
                            </div>
                            <StatusBadge status={row.status} />
                          </div>
                          <p className="mt-2 text-sm text-muted">{row.reason}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Today's schedule */}
        <Card className="h-full">
          <CardBody>
            <h2 className="text-base font-semibold text-ink">Today&rsquo;s schedule</h2>
            <p className="mt-0.5 text-sm text-muted">Your confirmed visits for today.</p>

            {todaySchedule.length === 0 ? (
              <div className="mt-5 grid place-items-center rounded-xl border border-dashed border-line bg-background px-6 py-8 text-center">
                <div>
                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary-tint text-primary">
                    <Icon name="calendar" size={22} />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-ink">Nothing scheduled</h3>
                  <p className="mx-auto mt-1 max-w-[34ch] text-sm leading-6 text-muted">
                    Confirmed visits for today appear here.
                  </p>
                </div>
              </div>
            ) : (
              <ol className="mt-5">
                {todaySchedule.map((visit) => (
                  <li key={visit.id} className="border-t border-line first:border-t-0">
                    <button
                      type="button"
                      onClick={() => openDetails(visit)}
                      className="flex w-full items-start gap-4 rounded-lg py-3 text-left transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="w-14 shrink-0 text-sm font-semibold text-primary">
                        {visit.time}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">
                          {visit.patient}
                        </span>
                        <span className="block text-sm text-muted">{visit.reason}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ---------- Detail modal ---------- */}
      <Modal
        open={Boolean(selected)}
        onClose={closeDetails}
        size="lg"
        title={isEditing ? 'Edit appointment status' : 'Appointment details'}
        description={selected ? `${selected.patient} · ${formatDate(selected.date)}` : ''}
        footer={
          selected ? (
            isEditing ? (
              <>
                <Button variant="secondary" onClick={cancelEdit} disabled={savingStatus}>
                  Cancel
                </Button>
                <Button
                  loading={savingStatus}
                  disabled={saveBlocked || savingStatus}
                  onClick={saveStatus}
                >
                  Save status
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={closeDetails}>
                  Close
                </Button>
                {!preview && canEdit && <Button onClick={startEdit}>Edit</Button>}
              </>
            )
          ) : null
        }
      >
        {selected && (
          <div>
            {preview && (
              <p className="mb-4 rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm text-muted">
                Preview mode — these are sample records, so changes are disabled.
              </p>
            )}

            <dl>
              <DetailRow label="Patient">{selected.patient}</DetailRow>
              <DetailRow label="Date">{formatDate(selected.date)}</DetailRow>
              <DetailRow label="Time">{selected.time}</DetailRow>
              <DetailRow label="Reason">{selected.reason}</DetailRow>
              <DetailRow label="Status">
                <StatusBadge status={selected.status} />
              </DetailRow>
            </dl>

            {/* ---------- Edit status ---------- */}
            {isEditing ? (
              <div className="mt-5 border-t border-line pt-5">
                <h3 className="text-sm font-semibold text-ink">New status</h3>
                <p className="mt-0.5 text-sm text-muted">
                  Only the transitions the clinic allows are listed.
                </p>

                <div className="mt-3 grid gap-2">
                  {options.map((option) => {
                    const blocked = option.needsPrescription && !prescriptionExists
                    return (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors ${
                          blocked
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
                          disabled={blocked || savingStatus}
                          onChange={() => {
                            setDraftStatus(option.value)
                            setStatusError('')
                          }}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary,#2563eb)]"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink">{option.label}</span>
                          {option.needsPrescription && (
                            <span className="mt-0.5 block text-xs text-muted">
                              {blocked
                                ? 'Issue a prescription first — this visit has none yet.'
                                : 'This visit already has a prescription.'}
                            </span>
                          )}
                        </span>
                      </label>
                    )
                  })}
                </div>

                {statusError && (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg border border-danger-border bg-danger-tint px-3.5 py-2.5 text-sm font-medium text-danger"
                  >
                    {statusError}
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* ---------- Notes ---------- */}
                {!preview && (
                  <div className="mt-5 border-t border-line pt-5">
                    <label
                      htmlFor="appointment-notes"
                      className="block text-sm font-semibold text-ink"
                    >
                      Your notes
                    </label>
                    <p className="mt-0.5 text-sm text-muted">
                      Consultation notes for this visit (max 300 characters).
                    </p>
                    <textarea
                      id="appointment-notes"
                      rows={3}
                      maxLength={300}
                      value={notesDraft}
                      onChange={(event) => setNotesDraft(event.target.value)}
                      placeholder="e.g. Reviewed blood pressure, adjusted dosage."
                      className="mt-2 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-muted">{notesDraft.length}/300</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busy === 'notes'}
                        disabled={Boolean(busy) || notesDraft === (selected.notes || '')}
                        onClick={saveNotes}
                      >
                        Save notes
                      </Button>
                    </div>
                  </div>
                )}

                {/* ---------- Prescription ---------- */}
                {canPrescribe ? (
                  <PrescriptionSection
                    appointmentId={selected.id}
                    prescription={prescription}
                    checking={checkingPrescription}
                    checkError={prescriptionError}
                    onReload={loadPrescription}
                    onChanged={handlePrescriptionChanged}
                  />
                ) : (
                  <div className="mt-5 border-t border-line pt-5">
                    <h3 className="text-sm font-semibold text-ink">Prescription</h3>
                    <p className="mt-2 rounded-lg border border-dashed border-line bg-background px-3.5 py-3 text-sm text-muted">
                      {selected.status === 'pending'
                        ? 'Confirm this visit first — prescriptions can only be issued for confirmed visits.'
                        : 'This visit is final, so its prescription can no longer be changed here.'}
                    </p>
                  </div>
                )}
              </>
            )}

            {actionError && (
              <p
                role="alert"
                className="mt-5 rounded-lg border border-danger-border bg-danger-tint px-3.5 py-2.5 text-sm font-medium text-danger"
              >
                {actionError}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
