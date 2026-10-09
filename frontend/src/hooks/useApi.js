import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/auth.js'

/**
 * Small GET hook.
 *
 *   const { data, loading, error, refetch } = useApi('/appointments/?page=1&limit=100')
 *
 * Returns:
 *   data    — the raw JSON response (unwrap `.results` yourself where paginated)
 *   loading — true while the request is in flight
 *   error   — an ApiError, or null
 *   refetch — re-runs the same request
 *
 * Options:
 *   useApi(path, { enabled: false })  → don't fetch yet
 *   useApi(path, { auth: false })     → skip the Bearer token
 */
export function useApi(path, options = {}) {
  const { enabled = true, ...requestOptions } = options

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(Boolean(path) && enabled)
  const [error, setError] = useState(null)
  const [nonce, setNonce] = useState(0)

  // Keep the latest options in a ref so changing an inline object
  // doesn't restart the request on every render.
  const optionsRef = useRef(requestOptions)
  optionsRef.current = requestOptions

  // A stable key so genuinely different options DO re-trigger the effect.
  const optionsKey = JSON.stringify(requestOptions)

  useEffect(() => {
    if (!path || !enabled) {
      setLoading(false)
      setError(null)
      return undefined
    }

    let cancelled = false

    setLoading(true)
    setError(null)

    api
      .get(path, { auth: true, ...optionsRef.current })
      .then((response) => {
        if (!cancelled) setData(response)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [path, enabled, nonce, optionsKey])

  const refetch = useCallback(() => {
    setNonce((current) => current + 1)
  }, [])

  return { data, loading, error, refetch }
}

export default useApi
