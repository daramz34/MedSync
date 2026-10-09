import { useId } from 'react'
import { cn } from '../../utils/cn.js'

export default function Input({ label, error, hint, required, id, className, ...rest }) {
  const autoId = useId()
  const inputId = id || autoId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <input
        id={inputId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-11 w-full rounded-md border bg-surface px-3 text-sm text-ink',
          'placeholder:text-muted transition-colors duration-150',
          'focus:outline-none focus:ring-2',
          'disabled:cursor-not-allowed disabled:bg-background disabled:text-muted',
          error
            ? 'border-danger-border focus:border-danger focus:ring-danger/20'
            : 'border-line focus:border-primary focus:ring-primary/20',
          className,
        )}
        {...rest}
      />

      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
