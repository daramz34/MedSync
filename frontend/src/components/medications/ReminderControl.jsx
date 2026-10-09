import { useState } from 'react'
import Button from '../ui/Button.jsx'
import { api } from '../../services/auth.js'

const MEDICATIONS_PATH = '/medications'
const TEST_REMINDER_PATH = '/reminders/test-reminder'

const INPUT_CLASS =
  'rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/* How many dose times frequency implies. Editable — never enforced. */
const SUGGESTED_COUNT = {
  once_daily: 1,
  twice_daily: 2,
  thrice_daily: 3,
  weekly: 1,
  as_needed: 0,
}

/* Prefill only — the patient reviews and saves. Never claimed as the prescription. */
const SUGGESTED_TIMES = ['08:00', '14:00', '20:00']

const FREQUENCY_NOTE = {
  once_daily: 'We email you at this time each day.',
  twice_daily: 'Set a time for each dose — we email you at each one.',
  thrice_daily: 'Set a time for each dose — we email you at each one.',
  weekly: 'Weekly medicines are not day-filtered yet, so this reminds you daily at these times.',
  as_needed: 'Taken as needed, so no reminder is set by default — add a time if a nudge helps.',
}

function formatTime(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function suggestionsFor(frequency) {
  const count = SUGGESTED_COUNT[String(frequency || '').toLowerCase()] ?? 1
  return Array.from({ length: count }, (_, index) => ({
    key: `suggested-${index}`,
    time: SUGGESTED_TIMES[index] || SUGGESTED_TIMES[0],
  }))
}

function savedRows(medication) {
  const rows = Array.isArray(medication.reminders) ? medication.reminders : []
  return rows.map((row) => ({ key: `saved-${row.id}`, time: formatTime(row.time_of_day) }))
}

export default function ReminderControl({ medication, onSaved }) {
  const saved = savedRows(medication)
  const savedEnabled = Boolean(medication.reminder_enabled) && saved.length > 0

  const [enabled, setEnabled] = useState(savedEnabled)
  const [rows, setRows] = useState(() => (saved.length ? saved : suggestionsFor(medication.frequency)))
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const signature = (on, list) =>
    JSON.stringify({ on, times: list.map((row) => row.time).sort() })

  const dirty = signature(enabled, rows) !== signature(savedEnabled, saved)

  function updateTime(key, value) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, time: value } : row)))
    setError('')
    setNotice('')
  }

  function addRow() {
    const fallback = rows.length ? rows[rows.length - 1].time : '08:00'
    setRows((current) => [...current, { key: `new-${Date.now()}`, time: fallback }])
    setError('')
    setNotice('')
  }

  function removeRow(key) {
    setRows((current) => current.filter((row) => row.key !== key))
    setError('')
    setNotice('')
  }

  async function save() {
    const clean = rows
      .map((row) => formatTime(row.time))
      .filter(Boolean)
      .map((time, index) => ({
        time_of_day: time,
        label: `Dose ${index + 1}`,
        enabled: true,
      }))

    if (enabled && clean.length === 0) {
      setError('Add at least one reminder time.')
      return
    }
    if (new Set(clean.map((item) => item.time_of_day)).size !== clean.length) {
      setError('Two reminders cannot be at the same time.')
      return
    }

    setBusy('save')
    setError('')
    setNotice('')
    try {
      const updated = await api.post(
        `${MEDICATIONS_PATH}/${medication.id}/reminders`,
        { enabled, times: clean },
        { auth: true },
      )
      setNotice('Reminder saved.')
      onSaved?.(updated)
    } catch (err) {
      setError(err?.message || 'Could not save the reminder.')
    } finally {
      setBusy('')
    }
  }

  async function sendTest() {
    setBusy('test')
    setError('')
    setNotice('')
    try {
      await api.post(TEST_REMINDER_PATH, { medication_id: Number(medication.id) }, { auth: true })
      setNotice('Test email sent — check your inbox.')
    } catch (err) {
      setError(err?.message || 'Could not send the test reminder.')
    } finally {
      setBusy('')
    }
  }

  const frequencyKey = String(medication.frequency || '').toLowerCase()
  const note = FREQUENCY_NOTE[frequencyKey] || 'We email you at each time you set.'

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-ink">Reminder times</h4>
          <p className="mt-0.5 text-xs text-muted">{note}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            savedEnabled
              ? 'border-primary-border bg-primary-tint text-primary'
              : 'border-line bg-background text-muted'
          }`}
        >
          {savedEnabled ? 'On' : 'Off'}
        </span>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={enabled}
          disabled={Boolean(busy)}
          onChange={(event) => {
            setEnabled(event.target.checked)
            setError('')
            setNotice('')
          }}
          className="h-4 w-4"
        />
        Enable reminders
      </label>

      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2">
            <input
              type="time"
              aria-label="Reminder time"
              value={row.time}
              disabled={!enabled || Boolean(busy)}
              onChange={(event) => updateTime(row.key, event.target.value)}
              className={`${INPUT_CLASS} disabled:opacity-60`}
            />
            <button
              type="button"
              onClick={() => removeRow(row.key)}
              disabled={Boolean(busy)}
              className="rounded-md px-2 text-xs font-semibold text-danger transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            >
              Remove
            </button>
          </div>
        ))}

        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-line bg-background px-3 py-4 text-center text-xs text-muted">
            No reminder times yet.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={addRow}
        disabled={Boolean(busy)}
        className="mt-2 rounded-md text-sm font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        + Add another time
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} loading={busy === 'save'} disabled={!dirty || Boolean(busy)}>
          Save reminder
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={sendTest}
          loading={busy === 'test'}
          disabled={Boolean(busy)}
        >
          Send test reminder
        </Button>
      </div>

      {notice && <p className="mt-2 text-xs font-medium text-primary">{notice}</p>}
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      <p className="mt-2 text-xs leading-5 text-muted">
        Suggested times only — adjust them to match your prescription. A reminder is not proof a dose
        was taken; only marking it does that.
      </p>
    </div>
  )
}
