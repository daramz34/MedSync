import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import Card, { CardBody } from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import Modal from '../components/ui/Modal.jsx'
import { auth, api } from '../services/auth.js'
import { IssuePrescriptionModal } from '../components/prescriptions/PrescriptionSection.jsx'

const PAGE_LIMIT = 100

/* ---------- helpers ---------- */

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

/** Never let an object reach JSX — nested patient/doctor become strings. */
function asText(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    return String(value.full_name || value.name || value.username || value.id || fallback)
  }
  return String(value)
}

function firstValue(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== '') ?? ''
}

function normalizeRole(value) {
  return String(value || '').toLowerCase().split('.').pop()
}

/** A real appointment id — guards against fallback ids like "appointment-0". */
function isRealId(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0
}

/** { total, page, limit, results: [...] } or a bare array */
function toResults(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.prescriptions)) return response.prescriptions
  if (Array.isArray(response?.appointments)) return response.appointments
  return []
}

/**
 * Walk every page so `limit=100` can't silently truncate a list.
 * Throws on failure — better than reporting a wrong count.
 */
async function fetchAll(path, params = {}) {
  const build = (page) =>
    `${path}?${new URLSearchParams({
      page: String(page),
      limit: String(PAGE_LIMIT),
      ...params,
    })}`

  const first = await api.get(build(1), { auth: true })
  const rows = toResults(first)
  const total = Number(first?.total) || rows.length

  if (rows.length >= total) return rows

  const pageCount = Math.ceil(total / PAGE_LIMIT)
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      api.get(build(index + 2), { auth: true }).then(toResults),
    ),
  )

  return rows.concat(...rest)
}

/* ---------- QR helpers ---------- */

/** Precedence: revoked → expired → used → active. Takes a NORMALISED row. */
function getQrStatus(rx, now = new Date()) {
  if (!rx || !rx.qrCodeUrl) return 'none'
  if (rx.qrRevokedAt) return 'revoked'
  if (rx.qrExpiresAt && new Date(rx.qrExpiresAt) < now) return 'expired'
  if (rx.qrFirstUsedAt) return 'used'
  return 'active'
}

const QR_TONES = {
  none: 'border-line bg-background text-muted',
  active: 'border-primary-border bg-primary-tint text-primary',
  used: 'border-primary-border bg-primary-tint text-primary',
  expired: 'border-line bg-background text-muted',
  revoked: 'border-danger-border bg-danger-tint text-danger',
}

const QR_LABELS = {
  none: 'No QR',
  active: 'Active',
  used: 'Used',
  expired: 'Expired',
  revoked: 'Revoked',
}

function QrBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        QR_TONES[status] || QR_TONES.none
      }`}
    >
      {QR_LABELS[status] || 'No QR'}
    </span>
  )
}

const QR_HELP = {
  active:
    'Show this at the pharmacy. Scanning it fills your medication list automatically.',
  used: 'This code has already been used.',
  expired: 'This code has expired. Ask your doctor to reissue it.',
  revoked: 'This code was revoked and can no longer be used.',
  none: 'No QR code has been issued for this prescription yet.',
}

/* ---------- normalisation ---------- */

function normalizePrescription(row = {}, index = 0) {
  const rawItems = Array.isArray(row.items) ? row.items : []

  return {
    id: firstValue(row.id, row.prescription_id, `prescription-${index}`),
    appointmentId: String(firstValue(row.appointment_id, '')),
    patient: asText(firstValue(row.patient, row.patient_name), 'Patient'),
    doctor: asText(firstValue(row.doctor, row.doctor_name), 'Doctor'),
    notes: String(firstValue(row.notes, '')),
    qrCodeUrl: firstValue(row.qr_code_url, ''),
    qrIssuedAt: firstValue(row.qr_issued_at, ''),
    qrExpiresAt: firstValue(row.qr_expires_at, ''),
    qrRevokedAt: firstValue(row.qr_revoked_at, ''),
    qrFirstUsedAt: firstValue(row.qr_first_used_at, ''),
    createdAt: firstValue(row.created_at, ''),
    items: rawItems.map((item, itemIndex) => ({
      id: firstValue(item.id, `item-${itemIndex}`),
      drugName: String(firstValue(item.drug_name, '—')),
      dosage: String(firstValue(item.dosage, '—')),
      frequency: pretty(firstValue(item.frequency, '—')),
      durationDays: firstValue(item.duration_days, '—'),
      instructions: String(firstValue(item.instructions, '')),
    })),
  }
}

function normalizeAppointment(row = {}, index = 0) {
  const rawDate = firstValue(row.appointment_date, row.date)
  const rawTime = firstValue(row.appointment_time, row.time)

  return {
    id: String(firstValue(row.id, row.appointment_id, `appointment-${index}`)),
    patient: asText(firstValue(row.patient, row.patient_name), 'Patient'),
    date: rawDate ? String(rawDate).slice(0, 10) : '',
    time: rawTime ? String(rawTime).slice(0, 5) : '—',
    reason: String(firstValue(row.reason, '—')),
    status: String(firstValue(row.status, 'pending')).toLowerCase(),
  }
}

/* ---------- building blocks ---------- */

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line py-3 first:border-t-0 first:pt-0">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-ink">{children}</dd>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="grid gap-3" aria-label="Loading" aria-busy="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-14 animate-pulse rounded-lg border border-line bg-background" />
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-danger-border bg-danger-tint px-5 py-6 text-center">
      <p className="text-sm font-semibold text-danger">Could not load this list</p>
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

function EmptyState({ icon, title, body, action }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-line bg-background px-6 py-10 text-center">
      <div>
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary-tint text-primary">
          <Icon name={icon} size={22} />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
        <p className="mx-auto mt-1 max-w-[42ch] text-sm leading-6 text-muted">{body}</p>
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  )
}

/* ---------- page ---------- */

export default function PrescriptionsPage() {
  const user = auth.getStoredUser()
  const role = normalizeRole(user?.role)
  const isDoctorView = role === 'doctor' || role === 'admin'

  const [tab, setTab] = useState('issued')

  const [rows, setRows] = useState([])            // prescriptions
  const [appointments, setAppointments] = useState([]) // confirmed visits (doctors only)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')

  /* ---- issue-in-place, for the Awaiting tab ---- */
  const [issueTarget, setIssueTarget] = useState(null)

  const tabRefs = useRef({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [prescriptions, visits] = await Promise.all([
        fetchAll('/prescriptions/'),
        isDoctorView
          ? fetchAll('/appointments/', { status: 'confirmed' })
          : Promise.resolve([]),
      ])
      setRows(prescriptions)
      setAppointments(visits)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [isDoctorView])

  useEffect(() => {
    load()
  }, [load])

  // Refresh when a prescription is created elsewhere (e.g. /doctor).
  useEffect(() => {
    function handleChanged() {
      load()
    }
    window.addEventListener('medsync:prescriptions-changed', handleChanged)
    return () =>
      window.removeEventListener('medsync:prescriptions-changed', handleChanged)
  }, [load])

  const prescriptions = rows.map(normalizePrescription)
  const visits = appointments.map(normalizeAppointment)

  // Visits that already have a prescription (match on appointment_id).
  const issuedAppointmentIds = new Set(
    prescriptions.map((rx) => rx.appointmentId).filter(Boolean),
  )

  const awaiting = visits.filter(
    (visit) => visit.status !== 'cancelled' && !issuedAppointmentIds.has(visit.id),
  )

  const qrStatus = getQrStatus(selected)

  function openDetails(row) {
    setSelected(row)
    setActionError('')
    setBusy('')

    api
      .get(`/prescriptions/${row.id}`, { auth: true })
      .then((fresh) => {
        if (!fresh) return
        setSelected((current) =>
          current && current.id === row.id ? normalizePrescription(fresh) : current,
        )
      })
      .catch(() => {
        /* keep the row we already have */
      })
  }

  function closeDetails() {
    setSelected(null)
    setActionError('')
    setBusy('')
  }

  /** POST /prescriptions/{id}/revoke-qr */
  async function revokeQr() {
    if (!selected) return
    setBusy('revoke')
    setActionError('')
    try {
      const updated = await api.post(
        `/prescriptions/${selected.id}/revoke-qr`,
        {},
        { auth: true },
      )

      setRows((current) =>
        current.map((row) => (row.id === selected.id ? { ...row, ...updated } : row)),
      )
      setSelected((current) =>
        current ? { ...current, ...normalizePrescription(updated) } : current,
      )
    } catch (err) {
      setActionError(err?.message || 'Could not revoke this QR code.')
    } finally {
      setBusy('')
    }
  }

  /* ---------- tabs ---------- */

  const TABS = [
    { id: 'issued', label: 'Issued', count: prescriptions.length },
    { id: 'awaiting', label: 'Awaiting prescription', count: awaiting.length },
  ]

  function onTabKeyDown(event) {
    const index = TABS.findIndex((item) => item.id === tab)
    let next = null

    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = TABS.length - 1
    else return

    event.preventDefault()
    const nextTab = TABS[next].id
    setTab(nextTab)
    tabRefs.current[nextTab]?.focus()
  }

  /* ---------- columns ---------- */

  const issuedColumns = [
    { key: 'date', header: 'Issued', render: (row) => formatDate(row.createdAt) },
    isDoctorView
      ? { key: 'patient', header: 'Patient', render: (row) => row.patient }
      : { key: 'doctor', header: 'Doctor', render: (row) => row.doctor },
    {
      key: 'items',
      header: 'Medicines',
      render: (row) => `${row.items.length} item${row.items.length === 1 ? '' : 's'}`,
    },
    { key: 'qr', header: 'QR', render: (row) => <QrBadge status={getQrStatus(row)} /> },
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

  const awaitingColumns = [
    { key: 'patient', header: 'Patient' },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
    { key: 'time', header: 'Time' },
    { key: 'reason', header: 'Reason' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        isRealId(row.id) ? (
          <Button variant="secondary" size="sm" onClick={() => setIssueTarget(row)}>
            Issue
          </Button>
        ) : null,
    },
  ]

  const countsLoading = loading || Boolean(error)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Prescriptions
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isDoctorView
              ? 'Prescriptions you have issued, and visits still waiting for one.'
              : 'Your prescriptions, with the QR code you show at the pharmacy.'}
          </p>
        </div>
      </div>

      {/* Doctor-only tabs */}
      {isDoctorView && (
        <div
          role="tablist"
          aria-label="Prescription views"
          className="mt-6 flex flex-wrap gap-1 border-b border-line"
        >
          {TABS.map((item) => {
            const selectedTab = tab === item.id
            return (
              <button
                key={item.id}
                ref={(node) => {
                  tabRefs.current[item.id] = node
                }}
                role="tab"
                type="button"
                id={`tab-${item.id}`}
                aria-selected={selectedTab}
                aria-controls={`panel-${item.id}`}
                tabIndex={selectedTab ? 0 : undefined}
                onClick={() => setTab(item.id)}
                onKeyDown={onTabKeyDown}
                className={`-mb-px flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  selectedTab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {item.label}
                <span
                  className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    selectedTab
                      ? 'bg-primary-tint text-primary'
                      : 'bg-background text-muted'
                  }`}
                >
                  {countsLoading ? '—' : item.count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <Card className={isDoctorView ? 'mt-5' : 'mt-6'}>
        <CardBody>
          {loading ? (
            <LoadingRows />
          ) : error ? (
            <ErrorState message={error.message} onRetry={load} />
          ) : !isDoctorView || tab === 'issued' ? (
            /* ---------------- ISSUED ---------------- */
            <div
              role={isDoctorView ? 'tabpanel' : undefined}
              id={isDoctorView ? 'panel-issued' : undefined}
              aria-labelledby={isDoctorView ? 'tab-issued' : undefined}
            >
              {prescriptions.length === 0 ? (
                <EmptyState
                  icon="prescription"
                  title="No prescriptions yet"
                  body={
                    isDoctorView
                      ? 'Issue a prescription from a confirmed appointment and it appears here.'
                      : 'After a visit, your doctor’s prescription appears here with a QR code for the pharmacy.'
                  }
                />
              ) : (
                <>
                  <div className="hidden sm:block">
                    <Table
                      columns={issuedColumns}
                      rows={prescriptions}
                      rowKey={(row) => row.id}
                      emptyMessage="No prescriptions."
                    />
                  </div>

                  <ul className="grid gap-3 sm:hidden">
                    {prescriptions.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => openDetails(row)}
                          className="w-full rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-primary-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink">
                                {formatDate(row.createdAt)}
                              </p>
                              <p className="mt-1 text-sm text-muted">
                                {isDoctorView ? row.patient : row.doctor}
                              </p>
                            </div>
                            <QrBadge status={getQrStatus(row)} />
                          </div>
                          <p className="mt-2 text-sm text-muted">
                            {row.items.length} medicine{row.items.length === 1 ? '' : 's'}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            /* ---------------- AWAITING ---------------- */
            <div role="tabpanel" id="panel-awaiting" aria-labelledby="tab-awaiting">
              {awaiting.length === 0 ? (
                <EmptyState
                  icon="check"
                  title="Nothing waiting"
                  body="Every confirmed visit with you already has a prescription. Confirm a new appointment and it shows up here."
                  action={
                    <Button variant="secondary" size="sm" to="/doctor">
                      Go to My desk
                    </Button>
                  }
                />
              ) : (
                <>
                  <p className="mb-4 text-sm text-muted">
                    {awaiting.length} confirmed visit
                    {awaiting.length === 1 ? '' : 's'} with no prescription yet. Issue one here —
                    no need to leave this page.
                  </p>

                  <div className="hidden sm:block">
                    <Table
                      columns={awaitingColumns}
                      rows={awaiting}
                      rowKey={(row) => row.id}
                      emptyMessage="Nothing waiting."
                    />
                  </div>

                  <ul className="grid gap-3 sm:hidden">
                    {awaiting.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-xl border border-line bg-surface p-4"
                      >
                        <p className="text-sm font-semibold text-ink">{row.patient}</p>
                        <p className="mt-1 text-sm text-muted">
                          {formatDate(row.date)} · {row.time}
                        </p>
                        <p className="mt-2 text-sm text-muted">{row.reason}</p>
                        {isRealId(row.id) && (
                          <div className="mt-3">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setIssueTarget(row)}
                            >
                              Issue prescription
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ---------- Issue prescription, in place ---------- */}
      <IssuePrescriptionModal
        open={Boolean(issueTarget)}
        appointmentId={issueTarget?.id}
        description={
          issueTarget
            ? `${issueTarget.patient} · ${formatDate(issueTarget.date)} at ${issueTarget.time}`
            : ''
        }
        onClose={() => setIssueTarget(null)}
        onIssued={() => {
          // Refresh both lists and move to Issued — the modal stays open so the
          // QR can be shown or revoked before closing.
          load()
          setTab('issued')
        }}
      />

      {/* ---------- Detail modal ---------- */}
      <Modal
        open={Boolean(selected)}
        onClose={closeDetails}
        title="Prescription details"
        description={
          selected
            ? `Issued ${formatDate(selected.createdAt)} · ${
                isDoctorView ? selected.patient : selected.doctor
              }`
            : ''
        }
        footer={
          selected ? (
            <Button variant="secondary" onClick={closeDetails}>
              Close
            </Button>
          ) : null
        }
      >
        {selected && (
          <div>
            <dl>
              {isDoctorView ? (
                <DetailRow label="Patient">{selected.patient}</DetailRow>
              ) : (
                <DetailRow label="Doctor">{selected.doctor}</DetailRow>
              )}
              {selected.appointmentId && (
                <DetailRow label="Appointment">#{selected.appointmentId}</DetailRow>
              )}
              <DetailRow label="Issued">{formatDate(selected.createdAt)}</DetailRow>
              <DetailRow label="QR status">
                <QrBadge status={qrStatus} />
              </DetailRow>
            </dl>

            {/* Medicines */}
            <div className="mt-5 border-t border-line pt-5">
              <h3 className="text-sm font-semibold text-ink">
                Medicines ({selected.items.length})
              </h3>

              {selected.items.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  This prescription has no items recorded.
                </p>
              ) : (
                <ul className="mt-3 grid gap-3">
                  {selected.items.map((item) => (
                    <li key={item.id} className="rounded-xl border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">{item.drugName}</p>
                        <span className="shrink-0 rounded-full border border-primary-border bg-primary-tint px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {item.frequency}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {item.dosage} · {item.durationDays} day
                        {String(item.durationDays) === '1' ? '' : 's'}
                      </p>
                      {item.instructions && (
                        <p className="mt-2 text-sm text-muted">{item.instructions}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Notes */}
            {selected.notes && (
              <div className="mt-5 border-t border-line pt-5">
                <h3 className="text-sm font-semibold text-ink">Notes</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{selected.notes}</p>
              </div>
            )}

            {/* Pharmacy QR code */}
            <div className="mt-5 border-t border-line pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">Pharmacy QR code</h3>
                <QrBadge status={qrStatus} />
              </div>

              {selected.qrCodeUrl ? (
                <div className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-line bg-surface p-5">
                  <img
                    src={selected.qrCodeUrl}
                    alt="Prescription QR code"
                    className="h-44 w-44 object-contain"
                  />
                  <p className="text-center text-xs leading-5 text-muted">
                    {QR_HELP[qrStatus]}
                  </p>
                  {selected.qrExpiresAt && qrStatus === 'active' && (
                    <p className="text-center text-xs text-muted">
                      Valid until {formatDate(selected.qrExpiresAt)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-line bg-background px-4 py-6 text-center text-sm text-muted">
                  {QR_HELP.none}
                </p>
              )}

              {qrStatus === 'active' && (
                <div className="mt-4">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={busy === 'revoke'}
                    disabled={Boolean(busy)}
                    onClick={revokeQr}
                  >
                    Revoke QR code
                  </Button>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Revoking stops this code from being scanned. It cannot be undone.
                  </p>
                </div>
              )}
            </div>

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
