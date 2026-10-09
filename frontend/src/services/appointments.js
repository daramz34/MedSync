import { api } from './auth.js'

/** GET /appointments/ → { total, page, limit, results } */
export function listAppointments({ page = 1, limit = 50, status } = {}) {
  const params = new URLSearchParams({ page, limit })
  if (status) params.set('status', status)
  return api.get(`/appointments/?${params}`, { auth: true })
}

/** GET /appointments/doctors → { doctors, total, page, limit } */
export function listDoctors({ page = 1, limit = 100 } = {}) {
  return api.get(`/appointments/doctors?page=${page}&limit=${limit}`, { auth: true })
}

/** POST /appointments/ { doctor_id, reason, appointment_date, appointment_time } */
export function bookAppointment(payload) {
  return api.post('/appointments/', payload, { auth: true })
}

/** PATCH /appointments/{id} { status?, notes? } */
export function updateAppointment(id, patch) {
  return api.patch(`/appointments/${id}`, patch, { auth: true })
}

/** DELETE /appointments/{id} → 204. Patient-side cancel. */
export function cancelAppointment(id) {
  return api.delete(`/appointments/${id}`, { auth: true })
}

/** GET /appointments/{id}/prescription */
export function getAppointmentPrescription(id) {
  return api.get(`/appointments/${id}/prescription`, { auth: true })
}
