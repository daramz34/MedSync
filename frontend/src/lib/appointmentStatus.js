/**
 * The ONLY status transitions the backend accepts.
 *   pending   → confirmed | cancelled
 *   confirmed → completed (requires a prescription) | cancelled
 *   completed / cancelled → final
 */
export const STATUS_OPTIONS = {
  pending: [
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
  confirmed: [
    { value: 'completed', label: 'Completed', needsPrescription: true },
    { value: 'cancelled', label: 'Cancelled' },
  ],
}

export const EDITABLE_STATUSES = Object.keys(STATUS_OPTIONS)

export const STATUS_TONES = {
  pending: 'border-line bg-background text-muted',
  confirmed: 'border-primary-border bg-primary-tint text-primary',
  completed: 'border-line bg-background text-muted',
  cancelled: 'border-danger-border bg-danger-tint text-danger',
}
