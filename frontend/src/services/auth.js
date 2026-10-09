/**
 * MedSync API client:
 * - Attaches the current user, tokens, and profile helpers
 * - Refreshes once after an authenticated 401, then retries
 * - Supports JSON, urlencoded and multipart (FormData) bodies
 * - Keeps the session in sync across tabs
 */

const BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
).replace(/\/+$/, '')

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
    // Storage may be unavailable; keep the in-memory session working.
  }
}

function deleteStorage(key) {
  try {
    if (hasWindow) window.localStorage.removeItem(key)
  } catch {
    // Ignore unavailable storage.
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

/**
 * Re-read both tokens from localStorage. Another tab may have logged in,
 * refreshed, or logged out since this module was first imported.
 */
function syncTokensFromStorage() {
  try {
    if (!hasWindow) return
    accessToken = window.localStorage.getItem(ACCESS_KEY)
    refreshToken = window.localStorage.getItem(REFRESH_KEY)
  } catch {
    // Keep the in-memory session if storage is unavailable.
  }
}

if (hasWindow) {
  // `storage` fires in OTHER tabs only, which is exactly what we want.
  window.addEventListener('storage', (event) => {
    if (event.key === ACCESS_KEY || event.key === REFRESH_KEY || event.key === null) {
      syncTokensFromStorage()
    }
  })

  // Belt and braces: some browsers miss events after sleep/resume.
  window.addEventListener('focus', syncTokensFromStorage)
}

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
  deleteStorage(ACCESS_KEY)
  deleteStorage(REFRESH_KEY)
}

/** True when we hold an access token. The token is what actually authenticates. */
export function isAuthenticated() {
  return Boolean(getAccessToken())
}

export function getStoredUser() {
  try {
    const raw = readStorage(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  if (user) {
    writeStorage(USER_KEY, JSON.stringify(user))
  } else {
    removeStoredUser()
  }
}

export function removeStoredUser() {
  deleteStorage(USER_KEY)
}

/* ---------- error formatting ---------- */

function formatDetail(detail, status) {
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
  if (status === 413) return 'That file is too large.'
  if (status === 415) return 'That file type is not supported.'
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

/* ---------- auth-expired signal ---------- */

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

/* ---------- single in-flight token refresh ---------- */

let refreshPromise = null

async function runRefresh() {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    // Read through the getter — another tab may have rotated it.
    const token = getRefreshToken()

    if (!token) {
      throw new ApiError('No refresh token', 401)
    }

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token }),
    })

    const data = await readResponseBody(response)

    if (!response.ok) {
      const detail = data && typeof data === 'object' ? data.detail : data
      throw new ApiError(
        formatDetail(detail, response.status),
        response.status,
        detail,
      )
    }

    setTokens(data)
    return data
  })()

  refreshPromise = refreshPromise.finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

/* ---------- core request ---------- */

async function doFetch(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    auth: useAuth = false,
  } = options

  const finalHeaders = { ...headers }
  let finalBody = body

  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData
  const isUrlSearchParams =
    typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams

  if (isUrlSearchParams && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
  } else if (body && !isFormData && !isUrlSearchParams) {
    // FormData must NOT get a Content-Type — the browser adds the
    // multipart boundary itself.
    finalHeaders['Content-Type'] = 'application/json'
    finalBody = JSON.stringify(body)
  }

  if (useAuth) {
    const token = getAccessToken()
    if (token) finalHeaders.Authorization = `Bearer ${token}`
  }

  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: finalBody,
  })
}

/**
 * @param {string} path API path, e.g. '/appointments/'
 * @param {object} options Request options: method, body, headers, auth, skipRefresh
 */
export async function request(path, options = {}) {
  const { auth: useAuth = false, skipRefresh = false } = options

  let response = await doFetch(path, options)

  if (response.status === 401 && useAuth && !skipRefresh) {
    if (getRefreshToken()) {
      try {
        await runRefresh()
      } catch {
        clearTokens()
        removeStoredUser()
        signalAuthExpired()
        throw new ApiError('Your session has expired. Please sign in again.', 401)
      }

      // Retry once with the fresh token. A FormData body is safe to reuse.
      response = await doFetch(path, options)
    } else {
      // No way to recover — drop the dead session instead of leaving it.
      clearTokens()
      removeStoredUser()
      signalAuthExpired()
      throw new ApiError('Your session has expired. Please sign in again.', 401)
    }
  }

  if (response.status === 204) return null

  const data = await readResponseBody(response)

  if (!response.ok) {
    const detail = data && typeof data === 'object' ? data.detail : data
    throw new ApiError(
      formatDetail(detail, response.status),
      response.status,
      detail,
    )
  }

  return data
}

/* ---------- generic API methods ---------- */

export const api = {
  get: (path, options = {}) =>
    request(path, { ...options, method: 'GET' }),

  post: (path, body, options = {}) =>
    request(path, { ...options, method: 'POST', body }),

  patch: (path, body, options = {}) =>
    request(path, { ...options, method: 'PATCH', body }),

  put: (path, body, options = {}) =>
    request(path, { ...options, method: 'PUT', body }),

  delete: (path, options = {}) =>
    request(path, { ...options, method: 'DELETE' }),

  runRefresh,
}

/* ---------- authentication methods ---------- */

async function login({ username, password }) {
  const form = new URLSearchParams({
    grant_type: 'password',
    username,
    password,
  })

  const data = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    skipRefresh: true,
  })

  if (!data?.access_token) {
    throw new ApiError('The server did not return an access token.', 200)
  }

  setTokens(data)

  if (data.user) {
    setStoredUser(data.user)
    return data.user
  }

  try {
    return await getCurrentUser()
  } catch (error) {
    clearTokens()
    removeStoredUser()
    throw error
  }
}

async function register(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: payload,
    skipRefresh: true,
  })
}

async function getCurrentUser() {
  const user = await request('/auth/me', { auth: true })
  if (user) setStoredUser(user)
  return user
}

/**
 * Best-effort server revocation. Local state is ALWAYS cleared, and this
 * never throws — otherwise `await auth.logout()` would reject and the
 * caller's redirect to /login would never run.
 */
async function logout() {
  const token = getRefreshToken()

  try {
    if (token) {
      await request('/auth/logout', {
        method: 'POST',
        body: { refresh_token: token },
        skipRefresh: true,
      })
    }
  } catch {
    // Offline or already-expired token: the local session still goes away.
  } finally {
    clearTokens()
    removeStoredUser()
  }
}

/* ---------- profile & account ---------- */

/**
 * POST /auth/change-password
 * Body must be EXACTLY these two keys (the schema forbids extras).
 * On success the backend revokes every refresh token, so sign the
 * user out and send them to /login.
 *
 * Accepts camelCase OR snake_case so callers can't get it wrong.
 */
async function changePassword({
  currentPassword,
  newPassword,
  current_password,
  new_password,
} = {}) {
  return request('/auth/change-password', {
    method: 'POST',
    auth: true,
    body: {
      current_password: currentPassword ?? current_password,
      new_password: newPassword ?? new_password,
    },
  })
}

/**
 * POST /auth/me/picture
 * multipart/form-data, field name "file", max 5 MB.
 * Returns the updated UserResponse and refreshes the cached user.
 */
async function uploadProfilePicture(file) {
  if (!file) throw new ApiError('Choose an image first.', 400)

  const form = new FormData()
  form.append('file', file)

  const user = await request('/auth/me/picture', {
    method: 'POST',
    auth: true,
    body: form, // FormData → no Content-Type set, no JSON stringify
  })

  if (user) setStoredUser(user)
  return user
}

/**
 * DELETE /auth/me/picture → 204, then re-read /auth/me so the
 * cached user no longer carries the old URL.
 */
async function removeProfilePicture() {
  await request('/auth/me/picture', { method: 'DELETE', auth: true })

  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}

/** PUT /auth/me — username, full_name, phone_number only. */
async function updateProfile(payload) {
  const user = await request('/auth/me', {
    method: 'PUT',
    auth: true,
    body: payload,
  })
  if (user) setStoredUser(user)
  return user
}

export const auth = {
  login,
  register,
  logout,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  getCurrentUser,
  isAuthenticated,
  changePassword,
  updateProfile,
  uploadProfilePicture,
  removeProfilePicture,
}
