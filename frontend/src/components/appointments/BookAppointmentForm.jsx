import { useEffect, useState } from 'react'
import Field from '../ui/Field.jsx'
import Button from '../ui/Button.jsx'
import { listDoctors, bookAppointment } from '../../services/appointments.js'

const INITIAL = {
  doctor_id: '',
  reason: '',
  appointment_date: '',
  appointment_time: '',
}

export default function BookAppointmentForm({ onBooked, onCancel }) {
  const [doctors, setDoctors] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [form, setForm] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    listDoctors()
      .then((data) => {
        if (!cancelled) setDoctors(Array.isArray(data?.doctors) ? data.doctors : [])
      })
      .catch((err) => {
        if (!cancelled) setFormError(err?.message || 'Could not load the doctor list.')
      })
      .finally(() => {
        if (!cancelled) setLoadingDoctors(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function set(key) {
    return (event) => {
      const { value } = event.target
      setForm((current) => ({ ...current, [key]: value }))
      setErrors((current) => ({ ...current, [key]: '' }))
      setFormError('')
    }
  }

  function validate() {
    const next = {}
    if (!form.doctor_id) next.doctor_id = 'Choose a doctor.'
    if (!form.reason.trim()) next.reason = 'Describe the reason for your visit.'
    if (!form.appointment_date) next.appointment_date = 'Choose a date.'
    if (!form.appointment_time) next.appointment_time = 'Choose a time.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(event) {
    event.preventDefault()
    setFormError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      const created = await bookAppointment({
        doctor_id: Number(form.doctor_id),
        reason: form.reason.trim(),
        appointment_date: form.appointment_date, // "YYYY-MM-DD"
        appointment_time: form.appointment_time, // "HH:MM"
      })
      setForm(INITIAL)
      if (onBooked) onBooked(created)
    } catch (err) {
      setFormError(err?.message || 'Could not book the appointment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded-lg border border-danger-border bg-danger-tint px-3.5 py-2.5 text-sm text-danger">
          {formError}
        </p>
      )}

      <div>
        <label htmlFor="doctor_id" className="mb-1.5 block text-sm font-medium text-ink">
          Doctor <span className="text-danger">*</span>
        </label>
        <select
          id="doctor_id"
          name="doctor_id"
          value={form.doctor_id}
          onChange={set('doctor_id')}
          disabled={loadingDoctors}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        >
          <option value="">
            {loadingDoctors ? 'Loading doctors…' : 'Select a doctor'}
          </option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.full_name}
              {doctor.specialization ? ` — ${doctor.specialization}` : ''}
            </option>
          ))}
        </select>
        {errors.doctor_id && (
          <p className="mt-1 text-sm text-danger">{errors.doctor_id}</p>
        )}
        {!loadingDoctors && doctors.length === 0 && (
          <p className="mt-1 text-sm text-muted">
            No doctors are available yet. An administrator needs to create one first.
          </p>
        )}
      </div>

      <Field
        id="reason"
        name="reason"
        label="Reason for visit"
        value={form.reason}
        onChange={set('reason')}
        error={errors.reason}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="appointment_date"
          name="appointment_date"
          type="date"
          label="Date"
          value={form.appointment_date}
          onChange={set('appointment_date')}
          error={errors.appointment_date}
          required
        />
        <Field
          id="appointment_time"
          name="appointment_time"
          type="time"
          label="Time"
          value={form.appointment_time}
          onChange={set('appointment_time')}
          error={errors.appointment_time}
          required
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={submitting}>
          {submitting ? 'Booking…' : 'Request appointment'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
