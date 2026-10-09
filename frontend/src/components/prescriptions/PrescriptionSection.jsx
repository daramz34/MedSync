import { useEffect, useState } from 'react'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import { api } from '../../services/auth.js'
import DrugNameInput from './DrugNameInput.jsx'

/* ---------- helpers ---------- */

const INPUT_CLASS =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/** Suggestions only — the backend uses enums.Frequency. */
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

function pretty(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
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

/* ---------- the form (controlled) ---------- */

/**
 * The PARENT owns the "does a prescription exist?" fetch and passes the
 * result down, so it can gate the Completed option on it. This component
 * never fetches that endpoint itself — one call per modal open.
 *
 * Props:
 *   appointmentId  number   required — POST /prescriptions/ target
 *   prescription   object?  the existing prescription, or null
 *   checking       bool     parent's fetch is in flight
 *   checkError     string   parent's fetch failed
 *   onReload       fn       retry the parent's fetch
 *   onChanged      fn       (prescription) => void, after issue or revoke
 *   withDivider    bool     render the top rule (inline) or not (in a modal)
 */
export default function PrescriptionSection({
  appointmentId,
  prescription,
  checking,
  checkError,
  onReload,
  onChanged,
  withDivider = true,
}) {
  const [items, setItems] = useState(() => [emptyItem()])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  function updateItem(key, field, value) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    )
    setError('')
  }

  function addItem() {
    setItems((current) => [...current, emptyItem()])
  }

  function removeItem(key) {
    setItems((current) => (current.length === 1 ? current : current.filter((i) => i.key !== key)))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    const cleaned = items.map((item) => ({
      drug_name: item.drug_name.trim(),
      dosage: item.dosage.trim(),
      frequency: item.frequency.trim(),
      duration_days: Number(item.duration_days),
      instructions: item.instructions.trim(),
    }))

    const invalid = cleaned.some(
      (item) =>
        !item.drug_name ||
        !item.dosage ||
        !item.frequency ||
        !Number.isFinite(item.duration_days) ||
        item.duration_days <= 0,
    )

    if (invalid) {
      setError('Every item needs a drug name, dosage, frequency and a duration of at least 1 day.')
      return
    }

    const payload = {
      appointment_id: Number(appointmentId),
      items: cleaned.map((item) => {
        const next = {
          drug_name: item.drug_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration_days: item.duration_days,
        }
        if (item.instructions) next.instructions = item.instructions
        return next
      }),
    }
    const trimmedNotes = notes.trim()
    if (trimmedNotes) payload.notes = trimmedNotes

    setBusy('issue')
    try {
      const created = await api.post('/prescriptions/', payload, { auth: true })
      setItems([emptyItem()])
      setNotes('')
      onChanged?.(created)
    } catch (err) {
      setError(err?.message || 'Could not issue this prescription.')
    } finally {
      setBusy('')
    }
  }

  async function revoke() {
    if (!prescription) return
    setBusy('revoke')
    setError('')
    try {
      const updated = await api.post(
        `/prescriptions/${prescription.id}/revoke-qr`,
        {},
        { auth: true },
      )
      onChanged?.(updated)
    } catch (err) {
      setError(err?.message || 'Could not revoke this QR code.')
    } finally {
      setBusy('')
    }
  }

  const wrap = withDivider ? 'mt-5 border-t border-line pt-5' : ''

  if (checking) {
    return (
      <div className={wrap}>
        <p className="text-sm text-muted">Checking for a prescription…</p>
      </div>
    )
  }

  if (checkError) {
    return (
      <div className={wrap}>
        <div className="rounded-lg border border-danger-border bg-danger-tint px-3.5 py-2.5 text-sm font-medium text-danger">
          {checkError}
        </div>
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={onReload}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  /* ---- already issued: show it, offer revoke ---- */

  if (prescription) {
    return (
      <div className={wrap}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Prescription #{prescription.id} issued
            </h3>
            <p className="mt-0.5 text-sm text-muted">{formatDate(prescription.created_at)}</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-primary-border bg-primary-tint px-2.5 py-0.5 text-xs font-semibold text-primary">
            {prescription.qr_revoked_at ? 'QR revoked' : 'QR active'}
          </span>
        </div>

        <ul className="mt-4 grid gap-2">
          {(prescription.items || []).map((item) => (
            <li key={item.id} className="rounded-lg border border-line bg-background px-3.5 py-2.5">
              <p className="text-sm font-semibold text-ink">{item.drug_name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {item.dosage} · {pretty(item.frequency)} · {item.duration_days} days
              </p>
              {item.instructions && <p className="mt-1 text-xs text-muted">{item.instructions}</p>}
            </li>
          ))}
        </ul>

        {prescription.notes && (
          <p className="mt-3 text-sm text-muted">
            <span className="font-semibold text-ink">Notes: </span>
            {prescription.notes}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {prescription.qr_code_url && !prescription.qr_revoked_at && (
            <a
              href={prescription.qr_code_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center rounded-lg border border-line px-3.5 text-sm font-semibold text-ink transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Open QR code
            </a>
          )}
          {!prescription.qr_revoked_at && (
            <Button
              variant="secondary"
              size="sm"
              loading={busy === 'revoke'}
              disabled={Boolean(busy)}
              onClick={revoke}
            >
              Revoke QR
            </Button>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    )
  }

  /* ---- nothing issued yet: the form ---- */

  return (
    <form onSubmit={submit} className={wrap}>
      <h3 className="text-sm font-semibold text-ink">Issue a prescription</h3>
      <p className="mt-0.5 text-sm text-muted">
        Start typing a drug name to pick it from the catalogue, or type it freely.
      </p>

      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <div key={item.key} className="rounded-lg border border-line bg-background p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Item {index + 1}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="rounded-md text-xs font-semibold text-danger transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              {/* Catalogue typeahead — fills drug_name only. */}
              <DrugNameInput
                aria-label={`Drug name ${index + 1}`}
                placeholder="Drug name, e.g. Ibuprofen"
                maxLength={255}
                value={item.drug_name}
                onChange={(next) => updateItem(item.key, 'drug_name', next)}
                className={INPUT_CLASS}
              />
              <input
                aria-label={`Dosage ${index + 1}`}
                placeholder="Dosage, e.g. 500 mg"
                maxLength={100}
                value={item.dosage}
                onChange={(event) => updateItem(item.key, 'dosage', event.target.value)}
                className={INPUT_CLASS}
              />
              <input
                aria-label={`Frequency ${index + 1}`}
                list="frequency-suggestions"
                placeholder="Frequency, e.g. twice_daily"
                value={item.frequency}
                onChange={(event) => updateItem(item.key, 'frequency', event.target.value)}
                className={INPUT_CLASS}
              />
              <input
                aria-label={`Duration in days ${index + 1}`}
                type="number"
                min="1"
                max="365"
                placeholder="Duration (days)"
                value={item.duration_days}
                onChange={(event) => updateItem(item.key, 'duration_days', event.target.value)}
                className={INPUT_CLASS}
              />
              <input
                aria-label={`Instructions ${index + 1}`}
                placeholder="Instructions (optional), e.g. Take with food"
                maxLength={300}
                value={item.instructions}
                onChange={(event) => updateItem(item.key, 'instructions', event.target.value)}
                className={`${INPUT_CLASS} sm:col-span-2`}
              />
            </div>

            {BARE_NUMBER.test(item.dosage.trim()) && (
              <p className="mt-2 text-xs text-muted">
                If this is a strength, add the unit — e.g.{' '}
                <span className="font-medium text-ink">500 mg</span>.
              </p>
            )}
          </div>
        ))}
      </div>

      <datalist id="frequency-suggestions">
        {FREQUENCY_SUGGESTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={addItem}
        className="mt-3 rounded-md text-sm font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        + Add another item
      </button>

      <div className="mt-4">
        <label htmlFor="prescription-notes" className="block text-sm font-medium text-ink">
          Prescription notes (optional)
        </label>
        <textarea
          id="prescription-notes"
          rows={2}
          maxLength={300}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value)
            setError('')
          }}
          placeholder="e.g. Allergy: Penicillin"
          className={`mt-1.5 ${INPUT_CLASS}`}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-danger-border bg-danger-tint px-3.5 py-2.5 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-4">
        <Button type="submit" size="sm" loading={busy === 'issue'} disabled={Boolean(busy)}>
          Issue prescription
        </Button>
      </div>
    </form>
  )
}

/* ---------- self-fetching modal, for /prescriptions ---------- */

/**
 * Wraps the controlled form: owns its own prescription check so
 * PrescriptionsPage doesn't have to duplicate that logic.
 */
export function IssuePrescriptionModal({
  open,
  appointmentId,
  description,
  onClose,
  onIssued,
}) {
  const [prescription, setPrescription] = useState(null)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!open || appointmentId == null) {
      setPrescription(null)
      setChecking(false)
      setCheckError('')
      return undefined
    }

    let cancelled = false
    setChecking(true)
    setCheckError('')

    api
      .get(`/appointments/${appointmentId}/prescription`, { auth: true })
      .then((found) => {
        if (!cancelled) setPrescription(found || null)
      })
      .catch((err) => {
        if (cancelled) return
        setPrescription(null)
        // 404 means "none yet" — only surface real failures.
        if (err?.status !== 404) {
          setCheckError(err?.message || 'Could not check for an existing prescription.')
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, appointmentId, reloadKey])

  function reload() {
    setReloadKey((key) => key + 1)
  }

  function handleChanged(updated) {
    if (updated) setPrescription(updated)
    else reload()
    onIssued?.(updated)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue a prescription"
      description={description || ''}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {open && appointmentId != null && (
        <PrescriptionSection
          appointmentId={appointmentId}
          prescription={prescription}
          checking={checking}
          checkError={checkError}
          onReload={reload}
          onChanged={handleChanged}
          withDivider={false}
        />
      )}
    </Modal>
  )
}
