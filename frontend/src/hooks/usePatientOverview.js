import { useCallback, useEffect, useState } from 'react'
import { listAppointments } from '../services/appointments.js'
import { listPrescriptions } from '../services/prescriptions.js'
import { listMedications } from '../services/medications.js'

function toResults(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.results)) return response.results
  return []
}

/** Local YYYY-MM-DD, matching the API's date format. */
function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/**
 * Loads the three patient-facing collections in parallel.
 * Each section has its own error so one failure doesn't blank the page.
 */
export function usePatientOverview() {
  const [state, setState] = useState({
    loading: true,
    appointments: [],
    prescriptions: [],
    medications: [],
    errors: {},
  })

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }))

    const [appointmentsResult, prescriptionsResult, medicationsResult] =
      await Promise.allSettled([
        listAppointments({ limit: 50 }),
        listPrescriptions({ limit: 10 }),
        listMedications(),
      ])

    const errors = {}
    if (appointmentsResult.status === 'rejected') {
      errors.appointments = appointmentsResult.reason?.message || 'Could not load appointments.'
    }
    if (prescriptionsResult.status === 'rejected') {
      errors.prescriptions = prescriptionsResult.reason?.message || 'Could not load prescriptions.'
    }
    if (medicationsResult.status === 'rejected') {
      errors.medications = medicationsResult.reason?.message || 'Could not load medications.'
    }

    setState({
      loading: false,
      appointments:
        appointmentsResult.status === 'fulfilled'
          ? toResults(appointmentsResult.value)
          : [],
      prescriptions:
        prescriptionsResult.status === 'fulfilled'
          ? toResults(prescriptionsResult.value)
          : [],
      medications:
        medicationsResult.status === 'fulfilled'
          ? (Array.isArray(medicationsResult.value) ? medicationsResult.value : [])
          : [],
      errors,
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Soonest upcoming visit that isn't finished.
  const upcoming = state.appointments
    .filter((row) => ['pending', 'confirmed'].includes(String(row.status).toLowerCase()))
    .filter((row) => String(row.appointment_date).slice(0, 10) >= todayIso())
    .sort((a, b) =>
      `${a.appointment_date}${a.appointment_time}`.localeCompare(
        `${b.appointment_date}${b.appointment_time}`,
      ),
    )

  return {
    ...state,
    refetch: load,
    nextAppointment: upcoming[0] || null,
  }
}
