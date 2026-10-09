import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn.js'
import Spinner from './Spinner.jsx'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold ' +
  'transition-colors duration-150 ease-out ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

const VARIANTS = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled',
  secondary:
    'border border-line bg-surface text-ink hover:border-primary-border hover:bg-primary-tint',
  danger: 'bg-danger text-white hover:bg-danger-hover',
  ghost: 'text-primary hover:bg-primary-tint',
}

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  to,
  href,
  loading = false,
  disabled = false,
  className,
  children,
  ...rest
}) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className)
  const content = (
    <>
      {loading && <Spinner />}
      {children}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    )
  }

  return (
    <button type={type} disabled={disabled || loading} className={classes} {...rest}>
      {content}
    </button>
  )
}
