import { api } from './auth.js'

/** GET /medications/ → plain array. Defaults to active only. */
export function listMedications({ status } = {}) {
  const query = status ? `?status=${status}` : ''
  return api.get(`/medications/${query}`, { auth: true })
}

/** POST /medications/ — manual medication entry */
export function createMedication(payload) {
  return api.post('/medications/', payload, { auth: true })
}

/** PATCH /medications/{id} { status?, reminder_time?, reminder_enabled? } */
export function updateMedication(id, patch) {
  return api.patch(`/medications/${id}`, patch, { auth: true })
}

/** DELETE /medications/{id} */
export function deleteMedication(id) {
  return api.delete(`/medications/${id}`, { auth: true })
}

/** POST /medications/{id}/test-reminder — emails yourself a test reminder */
export function testReminder(id) {
  return api.post(`/medications/${id}/test-reminder`, undefined, { auth: true })
}
