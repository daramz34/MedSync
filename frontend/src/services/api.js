/**
 * Shared MedSync API client: token storage, refresh, errors and user storage.
 */

const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

export const API_BASE_URL = BASE_URL

const ACCESS_KEY = 'medsync.access'
const REFRESH_KEY = 'medsync.refresh'
const USER_KEY = 'medsync.user'
const hasWindow = typeof window !== 'undefined'

function readStorage(key) {
  try {
    return hasWindow ? window.localStorage.getItem(key) : null
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    if (hasWindow) window.localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable in some browser privacy modes.
  }
}

function removeStorage(key) {
  try {
    if (hasWindow) window.localStorage.removeItem(key)
  } catch {
    // Storage can be unavailable in some browser privacy modes.
  }
}

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

/* ---------- token and user storage ---------- */

let accessToken = readStorage(ACCESS_KEY)
let refreshToken = readStorage(REFRESH_KEY)

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken() {
  return refreshToken
}

export function setTokens({ access_token, refresh_token } = {}) {
  if (access_token) {
    accessToken = access_token
    writeStorage(ACCESS_KEY, access_token)
  }

  if (refresh_token) {
    refreshToken = refresh_token
    writeStorage(REFRESH_KEY, refresh_token)
  }
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  removeStorage(ACCESS_KEY)
  removeStorage(REFRESH_KEY)
}

export function setStoredUser(user) {
  if (!user) {
    removeStoredUser()
    return
  }

  try {
    writeStorage(USER_KEY, JSON.stringify(user))
  } catch {
    // Ignore serialization/storage errors.
  }
}

export function getStoredUser() {
  const raw = readStorage(USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    removeStoredUser()
    return null
  }
}

export function removeStoredUser() {
  removeStorage(USER_KEY)
}

/* ---------- error formatting ---------- */

export function formatDetail(detail, status) {
  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null
        const message = item.msg || 'Invalid value'
        return field ? `${field}: ${message}` : message
      })
      .filter(Boolean)

    if (parts.length) return parts.join(', ')
  }

  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) return 'Not found.'
  if (status >= 500) return 'Something went wrong on the server. Please try again.'

  return `Request failed (${status})`
}

async function readResponseBody(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/* ---------- auth-expired event ---------- */

function signalAuthExpired() {
  if (hasWindow) {
    window.dispatchEvent(new CustomEvent('medsync:auth-expired'))
  }
}

export function onAuthExpired(callback) {
  if (!hasWindow) return () => {}

  window.addEventListener('medsync:auth-expired', callback)
  return () => window.removeEventListener('medsync:auth-expired', callback)
}

/* ---------- single in-flight refresh ---------- */

let refreshPromise = null

function runRefresh() {
  if (refreshPromise) return refreshPromise

  const pendingRefresh = (async () => {
    if (!refreshToken) {
      throw new ApiError('No refresh token', 401)
    }

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    const data = await readResponseBody(response)

    if (!response.ok) {
      const detail = data && typeof data === 'object' ? data.detail : data
      throw new ApiError(formatDetail(detail, response.status), response.status, detail)
    }

    setTokens(data)
    return data
  })()

  refreshPromise = pendingRefresh.finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

/* ---------- core request ---------- */

async function doFetch(path, { method, body, headers, auth }) {
  const finalHeaders = { ...headers }
  let finalBody = body

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const isUrlEncoded =
    typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams

  if (body && !isFormData && !isUrlEncoded) {
    finalHeaders['Content-Type'] = 'application/json'
    finalBody = JSON.stringify(body)
  }

  if (auth) {
    const token = getAccessToken()
    if (token) finalHeaders.Authorization = `Bearer ${token}`
  }

  return fetch(`${BASE_URL}${path}`, {
    method: method || 'GET',
    headers: finalHeaders,
    body: finalBody,
  })
}

export async function request(path, options = {}) {
  const { auth = false, skipRefresh = false } = options

  let response = await doFetch(path, options)

  if (response.status === 401 && auth && !skipRefresh && getRefreshToken()) {
    try {
      await runRefresh()
    } catch {
      clearTokens()
      removeStoredUser()
      signalAuthExpired()
      throw new ApiError('Your session has expired. Please sign in again.', 401)
    }

    response = await doFetch(path, options)
  }

  if (response.status === 204) return null

  const data = await readResponseBody(response)

  if (!response.ok) {
    const detail = data && typeof data === 'object' ? data.detail : data
    throw new ApiError(formatDetail(detail, response.status), response.status, detail)
  }

  return data
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  runRefresh,
}
