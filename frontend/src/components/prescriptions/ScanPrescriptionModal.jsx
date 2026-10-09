import { useState } from 'react'
import Button from '../ui/Button.jsx'
import Icon from '../ui/Icon.jsx'
import Modal from '../ui/Modal.jsx'
import { api } from '../../services/auth.js'

const MAX_TOKEN = 255

function asText(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    return String(value.full_name || value.name || value.username || value.id || fallback)
  }
  return String(value)
}

function pretty(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function errorCopy(error) {
  const status = error?.status
  if (status === 404) {
    return 'This code is not valid. It may have expired or already been used — ask the clinic for help.'
  }
  if (status === 403) {
    return 'Your account is not allowed to import this prescription.'
  }
  if (status === 429) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (status === 422) {
    return 'That does not look like a valid code. Check you copied the whole thing.'
  }
  return error?.message || 'Could not import this prescription.'
}

export default function ScanPrescriptionModal({ open, onClose, onScanned }) {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  function reset() {
    setToken('')
    setBusy(false)
    setError('')
    setResult(null)
  }

  function handleClose() {
    reset()
    onClose?.()
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    const trimmed = token.trim()
    if (!trimmed) {
      setError('Paste the code from your prescription first.')
      return
    }
    if (trimmed.length > MAX_TOKEN) {
      setError(`That code is too long (max ${MAX_TOKEN} characters).`)
      return
    }

    setBusy(true)
    try {
      const response = await api.post(
        '/prescriptions/scan',
        { qr_token: trimmed },
        { auth: true },
      )
      setResult(response)
      onScanned?.(response)
    } catch (err) {
      setError(errorCopy(err))
    } finally {
      setBusy(false)
    }
  }

  const created = Number(result?.medications_created) || 0
  const items = Array.isArray(result?.items) ? result.items : []

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={result ? 'Prescription imported' : 'Import prescribed medicines'}
      description={
        result
          ? created > 0
            ? 'These medicines are now on your medication list.'
            : 'These medicines were already on your list.'
          : 'Scan the code on your prescription with your phone camera, then paste the text it shows.'
      }
      footer={
        result ? (
          <Button onClick={handleClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="scan-form" loading={busy}>
              {busy ? 'Importing…' : 'Import medicines'}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div>
          {/* Outcome banner */}
          <div
            className={`flex items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm ${
              created > 0
                ? 'border-primary-border bg-primary-tint text-primary'
                : 'border-line bg-background text-muted'
            }`}
          >
            <Icon name={created > 0 ? 'check' : 'alert'} size={18} className="mt-0.5 shrink-0" />
            <span>
              {created > 0 ? (
                <>
                  <strong className="font-semibold">
                    {created} medication{created === 1 ? '' : 's'} added
                  </strong>{' '}
                  to your medication list.
                </>
              ) : (
                <>
                  <strong className="font-semibold">No new medications were added.</strong>{' '}
                  These are already on your list.
                </>
              )}
            </span>
          </div>

          <dl className="mt-5">
            <div className="flex items-start justify-between gap-4 border-t border-line py-3 first:border-t-0 first:pt-0">
              <dt className="shrink-0 text-sm text-muted">Patient</dt>
              <dd className="min-w-0 text-right text-sm font-medium text-ink">
                {asText(result.patient, 'Patient')}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-t border-line py-3">
              <dt className="shrink-0 text-sm text-muted">Prescription</dt>
              <dd className="text-right text-sm font-medium text-ink">
                #{result.prescription_id}
              </dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-line pt-5">
            <h3 className="text-sm font-semibold text-ink">
              Prescribed medicines ({items.length})
            </h3>

            {items.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No items on this prescription.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {items.map((item, index) => (
                  <li
                    key={item.id ?? index}
                    className="rounded-xl border border-line bg-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">
                        {item.drug_name || '—'}
                      </p>
                      <span className="shrink-0 rounded-full border border-primary-border bg-primary-tint px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {pretty(item.frequency)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {item.dosage || '—'} · {item.duration_days} day
                      {String(item.duration_days) === '1' ? '' : 's'}
                    </p>
                    {item.instructions && (
                      <p className="mt-2 text-sm text-muted">{item.instructions}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <form id="scan-form" onSubmit={onSubmit} noValidate>
          <label htmlFor="qr_token" className="block text-sm font-semibold text-ink">
            Prescription code
          </label>
          <p className="mt-0.5 text-sm text-muted">
            Point your phone camera at the QR code on your prescription, then paste the text it
            shows here.
          </p>

          <textarea
            id="qr_token"
            name="qr_token"
            rows={3}
            maxLength={MAX_TOKEN}
            autoFocus
            value={token}
            onChange={(event) => {
              setToken(event.target.value)
              setError('')
            }}
            placeholder="e.g. 3kAfVx5_A6KasSFUlgKWRe-_yGCxd_vATGmtil6sCpc"
            className="mt-2 w-full resize-none rounded-lg border border-line bg-surface px-3.5 py-2.5 font-mono text-sm text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />

          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-xs text-muted">
              Paste the full string — it is case sensitive.
            </span>
            <span className="text-xs text-muted">
              {token.trim().length}/{MAX_TOKEN}
            </span>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-danger-border bg-danger-tint px-3.5 py-2.5 text-sm font-medium text-danger"
            >
              {error}
            </p>
          )}

          <p className="mt-4 flex items-start gap-2.5 text-xs leading-5 text-muted">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-muted" />
            <span>
              This adds the prescribed medicines to your own medication list. If they are already
              there, nothing is duplicated.
            </span>
          </p>
        </form>
      )}
    </Modal>
  )
}
