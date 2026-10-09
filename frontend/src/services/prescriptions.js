import { api } from './auth.js'

/** GET /prescriptions/ → PaginatedPrescriptionResponse */
export function listPrescriptions({ page = 1, limit = 10 } = {}) {
  return api.get(`/prescriptions/?page=${page}&limit=${limit}`, { auth: true })
}

/** GET /prescriptions/{id} */
export function getPrescription(id) {
  return api.get(`/prescriptions/${id}`, { auth: true })
}

/** POST /prescriptions/ — doctor issues one */
export function createPrescription(payload) {
  return api.post('/prescriptions/', payload, { auth: true })
}

/** POST /prescriptions/{id}/revoke-qr */
export function revokePrescriptionQr(id) {
  return api.post(`/prescriptions/${id}/revoke-qr`, undefined, { auth: true })
}

/** POST /prescriptions/scan { qr_token } */
export function scanPrescriptionQr(qrToken) {
  return api.post('/prescriptions/scan', { qr_token: qrToken }, { auth: true })
}
