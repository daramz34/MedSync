import { useEffect, useState } from 'react'
import Button from '../ui/Button.jsx'
import { api } from '../../services/auth.js'

/* ---------- endpoints (the client already adds /api/v1) ---------- */

const LOGS_TODAY = '/logs/today'
const LOGS_CREATE = '/logs/'

/* Streaks: the route is unconfirmed. Set this to '/streaks' once /docs shows
   GET /streaks/{medication_id}. Left null it makes no request and hides. */
const STREAKS_PATH = '/streaks'

const STATUS_OPTIONS = [
  { value: 'taken', label: 'Taken', variant: 'primary' },
  { value: 'missed', label: 'Missed', variant: 'secondary' },
  { value: 'skipped', label: 'Skipped', variant: 'secondary' },
]

const HISTORY_LIMIT = 14

/* ---------- helpers ---------- */

function prettyStatus(value) {
  if (value == null) return ''
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Sample rows are 'sample-1'; real rows are 7. Only real rows may hit the API. */
function isPersisted(medication) {
  const id = Number(medication?.id)
  return Number.isSafeInteger(id) && id > 0
}

function errorStatus(err) {
  return err?.status ?? err?.statusCode ?? null
}

/* ---------- streak line ---------- */

function StreakLine({ streak }) {
  const current = streak.current_streak ?? 0
  const longest = streak.longest_streak ?? 0
  const taken = streak.total_taken ?? 0
  const pct = Math.round(Number(streak.completion_percentage) || 0)

  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <span>
        <strong className="text-ink">{current}</strong> day streak
      </span>
      <span>
        Best <strong className="text-ink">{longest}</strong>
      </span>
      <span>
        <strong className="text-ink">{taken}</strong> taken
      </span>
      <span>
        <strong className="text-ink">{pct}%</strong> completion
      </span>
    </div>
  )
}

/* ---------- the control ---------- */

/**
 * One check-in per day. The backend's unique constraint is
 * (medication_id, log_date), so this marks the DAY, not each dose.
 *
 * todayLogs: optional. Pass the parent's single GET /logs/today array to avoid
 * one request per card. Omit it and the component fetches its own.
 */
export default function AdherenceControl({
  medication,
  todayLogs,
  logsLoading = false,
  logsError = '',
  onLogged,
}) {
  const persisted = isPersisted(medication)
  const parentProvidesLogs = todayLogs !== undefined

  const [ownLogs, setOwnLogs] = useState(null)
  const [ownLoading, setOwnLoading] = useState(false)
  const [ownError, setOwnError] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)

  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [expanded, setExpanded] = useState(false)
  const [history, setHistory] = useState(null)
  const [historyBusy, setHistoryBusy] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const [streak, setStreak] = useState(medication?.streak ?? null)

  /* ---- today's log: self-fetch only when the parent didn't supply it ---- */
  useEffect(() => {
    if (parentProvidesLogs || !persisted) return undefined
    let cancelled = false
    setOwnLoading(true)
    setOwnError('')
    api
      .get(LOGS_TODAY, { auth: true })
      .then((data) => {
        if (!cancelled) setOwnLogs(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) setOwnError(err?.message || 'Could not load today’s check-ins.')
      })
      .finally(() => {
        if (!cancelled) setOwnLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [parentProvidesLogs, persisted, refreshNonce])

  /* ---- optional streak panel ---- */
  useEffect(() => {
    if (!persisted || !STREAKS_PATH) return undefined
    let cancelled = false
    api
      .get(`${STREAKS_PATH}/${medication.id}`, { auth: true })
      .then((data) => {
        if (!cancelled) setStreak(data || null)
      })
      .catch(() => {
        if (!cancelled) setStreak(null) // route missing or empty — just hide it
      })
    return () => {
      cancelled = true
    }
  }, [persisted, medication?.id, refreshNonce])

  /* ---- history: lazy, only while expanded ---- */
  useEffect(() => {
    if (!persisted || !expanded) return undefined
    let cancelled = false
    setHistoryBusy(true)
    setHistoryError('')
    api
      .get(`/logs/${medication.id}`, { auth: true })
      .then((data) => {
        if (!cancelled) setHistory(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!cancelled) setHistoryError(err?.message || 'Could not load history.')
      })
      .finally(() => {
        if (!cancelled) setHistoryBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [persisted, expanded, medication?.id, refreshNonce])

  const source = parentProvidesLogs ? todayLogs : ownLogs
  const loading = parentProvidesLogs ? logsLoading : ownLoading
  const loadError = parentProvidesLogs ? logsError : ownError

  const todayLog = Array.isArray(source)
    ? source.find((log) => String(log.medication_id) === String(medication?.id)) ?? null
    : null

  const locked = Boolean(todayLog)
  const disabled = !persisted || Boolean(busy) || locked || loading || Boolean(loadError)

  function afterCheckIn() {
    onLogged?.()
    if (!parentProvidesLogs) setRefreshNonce((n) => n + 1)
  }

  async function checkIn(status) {
    if (disabled) return
    setBusy(status)
    setError('')
    setNotice('')
    try {
      await api.post(
        LOGS_CREATE,
        { medication_id: Number(medication.id), status },
        { auth: true },
      )
      setNotice(`Logged today as ${prettyStatus(status)}.`)
      afterCheckIn()
    } catch (err) {
      // 409 = the unique constraint already has today's row (another tab).
      const already =
        errorStatus(err) === 409 || /already logged/i.test(String(err?.message || ''))
      if (already) {
        setError('Already logged today — showing the saved entry.')
        afterCheckIn()
      } else {
        setError(err?.message || 'Could not save your check-in.')
      }
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-ink">Today’s check-in</h4>
          <p className="mt-0.5 text-xs text-muted">
            One check-in per day — this marks the day, not each dose.
          </p>
        </div>
        {locked && (
          <span className="shrink-0 rounded-full border border-primary-border bg-primary-tint px-2.5 py-0.5 text-xs font-semibold text-primary">
            {prettyStatus(todayLog.status)}
          </span>
        )}
      </div>

      {!persisted ? (
        <p className="mt-3 text-xs leading-5 text-muted">
          Sample medication — check-ins are disabled in preview mode.
        </p>
      ) : (
        <>
          {loadError ? (
            <p role="alert" className="mt-3 text-xs font-medium text-danger">
              Could not load today’s check-ins. Reload the page to try again.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={option.variant}
                  loading={busy === option.value}
                  disabled={disabled}
                  onClick={() => checkIn(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}

          {loading && !locked && (
            <p className="mt-2 text-xs text-muted">Checking today’s status…</p>
          )}

          {notice && <p className="mt-2 text-xs font-medium text-primary">{notice}</p>}
          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}

          {streak && <StreakLine streak={streak} />}

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="mt-3 text-xs font-semibold text-primary hover:underline"
          >
            {expanded ? 'Hide history' : 'Show history'}
          </button>

          {expanded && (
            <div className="mt-2">
              {historyBusy && <p className="text-xs text-muted">Loading history…</p>}

              {historyError && (
                <p role="alert" className="text-xs font-medium text-danger">
                  {historyError}
                </p>
              )}

              {!historyBusy && !historyError && history?.length === 0 && (
                <p className="text-xs text-muted">No check-ins yet.</p>
              )}

              {!historyBusy && !historyError && history?.length > 0 && (
                <ul className="grid gap-1.5">
                  {history.slice(0, HISTORY_LIMIT).map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-x-3 rounded-lg border border-line bg-background px-3 py-1.5 text-xs"
                    >
                      <span className="text-muted">{log.log_date}</span>
                      <span className="font-medium text-ink">
                        {prettyStatus(log.status)}
                      </span>
                      {log.taken_at && (
                        <span className="text-muted">{String(log.taken_at).slice(0, 5)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
