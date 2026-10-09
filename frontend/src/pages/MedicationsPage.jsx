import { useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import Card, { CardBody } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import Modal from '../components/ui/Modal.jsx'
import { useApi } from '../hooks/useApi.js'
import { auth } from '../services/auth.js'
import ScanPrescriptionModal from '../components/prescriptions/ScanPrescriptionModal.jsx'
import ReminderControl from '../components/medications/ReminderControl.jsx'
import AdherenceControl from '../components/medications/AdherenceControl.jsx'

/* ---------- helpers ---------- */

function pretty(value) {
  if (value == null) return '—'
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function normalizeRole(value) {
  return String(value || '').toLowerCase().split('.').pop()
}

function statusOf(row) {
  return String(row?.status || '').toLowerCase()
}

function toList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.medications)) return response.medications
  return []
}

/** "08:00:00" → "08:00". On only when enabled AND a time is set. */
function reminderLabel(row) {
  const time = String(row.reminder_time || '').slice(0, 5)
  const on = Boolean(row.reminder_enabled) && Boolean(time)
  if (!on) return <span className="text-muted">Off</span>
  return <span className="font-medium text-ink">{time} daily</span>
}

/**
 * How far through the prescribed course the patient is.
 * `end_date` is EXCLUSIVE: it is the first day AFTER the course, so the last
 * dose lands on end_date − 1 day.
 */
function courseLabel(row) {
  if (statusOf(row) !== 'active') {
    return <span className="text-muted">Completed</span>
  }
  if (!row.end_date || !row.start_date) return <span className="text-muted">Ongoing</span>

  const start = new Date(`${row.start_date}T00:00:00`)
  const end = new Date(`${row.end_date}T00:00:00`)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lastDose = new Date(end)
  lastDose.setDate(lastDose.getDate() - 1)

  const totalDays = Number(row.duration_days)
    || Math.round((lastDose - start) / 86400000) + 1
  const dayNumber = Math.round((today - start) / 86400000) + 1

  if (today > lastDose) return <span className="text-muted">Course ended</span>

  const ends = lastDose.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  if (dayNumber === totalDays) {
    return (
      <span className="font-medium text-ink">
        Last day
        <span className="block text-xs font-normal text-muted">ends {ends}</span>
      </span>
    )
  }

  return (
    <span className="font-medium text-ink">
      Day {dayNumber} of {totalDays}
      <span className="block text-xs font-normal text-muted">ends {ends}</span>
    </span>
  )
}

/* ---------- sample data for preview mode ---------- */

const SAMPLE_MEDICATIONS = [
  {
    id: 'sample-1',
    drug_name: 'Metformin 500 mg',
    dosage: '500 mg',
    frequency: 'twice_daily',
    status: 'active',
  },
  {
    id: 'sample-2',
    drug_name: 'Lisinopril 10 mg',
    dosage: '10 mg',
    frequency: 'once_daily',
    status: 'active',
  },
]

/* ---------- states ---------- */

function LoadingRows() {
  return (
    <div className="grid gap-3" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-14 animate-pulse rounded-lg border border-line bg-background" />
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-danger-border bg-danger-tint px-5 py-6 text-center">
      <p className="text-sm font-semibold text-danger">Could not load your medications</p>
      <p className="mx-auto mt-1 max-w-[42ch] text-sm leading-6 text-ink/80">
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

function EmptyState({ onScan, canScan }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line bg-background px-6 py-10 text-center">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary-tint text-primary">
          <Icon name="heart" size={22} />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-ink">No active medications</h3>
        <p className="mx-auto mt-1 max-w-[42ch] text-sm leading-6 text-muted">
          When your doctor issues a prescription, the medications appear here. You can also
          import a prescription yourself to add them.
        </p>
        {canScan && (
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" size="sm" onClick={onScan}>
              Import prescribed medicines
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ value }) {
  const key = statusOf({ status: value })
  const tone =
    key === 'active'
      ? 'border-primary-border bg-primary-tint text-primary'
      : 'border-line bg-background text-muted'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone}`}
    >
      {pretty(value)}
    </span>
  )
}

/* ---------- page ---------- */

export default function MedicationsPage() {
  const [preview, setPreview] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanNotice, setScanNotice] = useState('')

  // Modals keep the ID, not the object, so a refetch flows through.
  const [reminderId, setReminderId] = useState(null)
  const [checkInId, setCheckInId] = useState(null)

  // The endpoint defaults to active-only, so both calls are explicit.
  const { data, loading, error, refetch } = useApi('/medications/?status=active')
  const { data: completedData, refetch: refetchCompleted } =
    useApi('/medications/?status=completed')

  const {
    data: todayLogData,
    loading: todayLogsLoading,
    error: todayLogsError,
    refetch: refetchTodayLogs,
  } = useApi('/logs/today')

  const user = auth.getStoredUser()
  const role = normalizeRole(user?.role)
  // Importing adds medications to the patient's own list.
  const canScan = role === 'patient'

  const activeMedications = preview ? SAMPLE_MEDICATIONS : toList(data)
  const pastMedications = preview ? [] : toList(completedData)

  // Everything a modal might need to look up by ID.
  const allMedications = [...activeMedications, ...pastMedications]

  const reminderMedication =
    allMedications.find((row) => String(row.id) === String(reminderId)) || null

  const checkInMedication =
    allMedications.find((row) => String(row.id) === String(checkInId)) || null

  const todayLogs = Array.isArray(todayLogData) ? todayLogData : []

  function onScanned(response) {
    const created = Number(response?.medications_created) || 0
    setScanNotice(
      created > 0
        ? `${created} medication${created === 1 ? '' : 's'} added from the prescription.`
        : 'That prescription is already on your list — nothing new was added.',
    )
    refetch()
    refetchCompleted()
  }

  const columns = [
    { key: 'drug_name', header: 'Medication' },
    { key: 'dosage', header: 'Dosage' },
    {
      key: 'frequency',
      header: 'Frequency',
      render: (row) => pretty(row.frequency),
    },
    {
      key: 'course',
      header: 'Course',
      render: (row) => courseLabel(row),
    },
    {
      key: 'reminder',
      header: 'Reminder',
      render: (row) => reminderLabel(row),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge value={row.status} />,
    },
    // Preview rows have no real ID, so no actions there.
    ...(preview
      ? []
      : [
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => (
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => setCheckInId(row.id)}>
                  Check in
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReminderId(row.id)}>
                  Reminder
                </Button>
              </div>
            ),
          },
        ]),
  ]

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
            ? 'Sample medications shown below.'
            : 'Currently showing the medications on your account.'}
        </span>
      </div>

      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Medications
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your active medications and how often to take them.
          </p>
        </div>

        {canScan && (
          <Button onClick={() => setScanOpen(true)}>Import prescribed medicines</Button>
        )}
      </div>

      {scanNotice && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-primary-border bg-primary-tint px-4 py-3 text-sm font-medium text-primary"
        >
          {scanNotice}
        </p>
      )}

      <Card className="mt-6">
        <CardBody>
          {loading && !preview ? (
            <LoadingRows />
          ) : error && !preview ? (
            <ErrorState message={error.message} onRetry={refetch} />
          ) : activeMedications.length === 0 ? (
            <EmptyState canScan={canScan} onScan={() => setScanOpen(true)} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table
                  columns={columns}
                  rows={activeMedications}
                  rowKey={(row) => row.id ?? row.drug_name}
                  emptyMessage="No medications."
                />
              </div>

              {/* Mobile cards */}
              <ul className="grid gap-3 sm:hidden">
                {activeMedications.map((row) => (
                  <li
                    key={row.id ?? row.drug_name}
                    className="rounded-xl border border-line bg-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{row.drug_name}</p>
                      <StatusBadge value={row.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {row.dosage} · {pretty(row.frequency)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Course: {courseLabel(row)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Reminder: {reminderLabel(row)}
                    </p>

                    {!preview && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setCheckInId(row.id)}
                        >
                          Check in
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setReminderId(row.id)}
                        >
                          Set reminder
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardBody>
      </Card>

      {/* Today's check-ins */}
      {canScan && activeMedications.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">Today’s check-ins</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            One check-in per medication per day — not one per dose.
          </p>

          <div className="grid gap-4">
            {activeMedications
              .filter((row) => statusOf(row) === 'active')
              .map((row) => (
                <div key={`check-in-${row.id}`}>
                  <h3 className="mb-1 px-1 text-sm font-semibold text-ink">
                    {row.drug_name}
                  </h3>
                  <AdherenceControl
                    medication={row}
                    todayLogs={todayLogs}
                    logsLoading={todayLogsLoading}
                    logsError={todayLogsError?.message || ''}
                    onLogged={refetchTodayLogs}
                  />
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Past courses */}
      {canScan && pastMedications.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">Past courses</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Courses that have finished. Your record stays here.
          </p>

          <ul className="grid gap-3">
            {pastMedications.map((row) => (
              <li
                key={`past-${row.id}`}
                className="rounded-xl border border-line bg-background p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-muted">{row.drug_name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {row.dosage} · {pretty(row.frequency)}
                    </p>
                  </div>
                  <StatusBadge value={row.status} />
                </div>
                <p className="mt-2 text-xs text-muted">
                  {row.start_date} → {row.end_date} · {courseLabel(row)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Check-in modal */}
      <Modal
        open={Boolean(checkInMedication)}
        onClose={() => setCheckInId(null)}
        title="Today’s check-in"
        description={
          checkInMedication
            ? `${checkInMedication.drug_name} · ${pretty(checkInMedication.frequency)}`
            : ''
        }
        footer={
          <Button variant="secondary" onClick={() => setCheckInId(null)}>
            Close
          </Button>
        }
      >
        {checkInMedication && (
          <AdherenceControl
            medication={checkInMedication}
            todayLogs={todayLogs}
            logsLoading={todayLogsLoading}
            logsError={todayLogsError?.message || ''}
            onLogged={refetchTodayLogs}
          />
        )}
      </Modal>

      {/* Reminder modal */}
      <Modal
        open={Boolean(reminderMedication)}
        onClose={() => setReminderId(null)}
        title="Medication reminder"
        description={
          reminderMedication
            ? `${reminderMedication.drug_name} · ${pretty(reminderMedication.frequency)}`
            : ''
        }
        footer={
          <Button variant="secondary" onClick={() => setReminderId(null)}>
            Close
          </Button>
        }
      >
        {reminderMedication && (
          <ReminderControl medication={reminderMedication} onSaved={() => refetch()} />
        )}
      </Modal>

      {/* Import modal */}
      <ScanPrescriptionModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScanned={onScanned}
      />
    </div>
  )
}
