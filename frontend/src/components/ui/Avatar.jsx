import { useEffect, useState } from 'react'

const SIZES = {
  sm: 'h-9 w-9 text-sm',    // navbar trigger
  md: 'h-12 w-12 text-base', // account panel
  lg: 'h-16 w-16 text-xl',   // profile page
}

/** Default fallback: the first letter of the name, uppercased. */
function firstLetterOf(name) {
  const trimmed = String(name || '').trim()
  return trimmed ? trimmed[0].toUpperCase() : 'P'
}

/**
 * Shows the user's uploaded picture when there is one.
 * Falls back to the first letter of their name otherwise — including
 * when the image URL exists but fails to load.
 *
 *   <Avatar user={user} size="sm" />
 *   <Avatar name="Daramz Praise" size="lg" />
 */
export default function Avatar({
  user,
  name,
  size = 'md',
  className = '',
  alt = '',
}) {
  const [failed, setFailed] = useState(false)

  const url = user?.profile_picture_url || ''
  const displayName = name || user?.full_name || 'Patient'
  const sizeClass = SIZES[size] || SIZES.md

  // A new upload should get a fresh chance to render.
  useEffect(() => {
    setFailed(false)
  }, [url])

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={alt}
        onError={() => setFailed(true)}
        className={`${sizeClass} shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} grid shrink-0 place-items-center rounded-full bg-primary font-bold text-white ${className}`}
    >
      {firstLetterOf(displayName)}
    </span>
  )
}
