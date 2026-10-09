import { useEffect, useRef } from 'react'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  children,
}) {
  const panelRef = useRef(null)

  // Escape closes; lock the page behind the modal.
  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Scroll + centering wrapper */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`relative flex w-full ${
            SIZES[size] || SIZES.md
          } max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl focus:outline-none`}
        >
          {/* Header — always visible */}
          {(title || onClose) && (
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                {title && (
                  <h2
                    id="modal-title"
                    className="truncate text-base font-semibold text-ink"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-0.5 truncate text-sm text-muted">{description}</p>
                )}
              </div>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-background hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </svg>
                </button>
              )}
            </header>
          )}

          {/* Body — the part that scrolls */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {/* Footer — always visible */}
          {footer && (
            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4">
              {footer}
            </footer>
          )}
        </div>
      </div>
    </div>
  )
}
