import { cn } from '../../utils/cn.js'

export default function LogoSlot({ size = 40, src, alt = 'MedSync logo', className }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn('rounded-md object-contain', className)}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label="Logo placeholder"
      style={{ width: size, height: size }}
      className={cn(
        'inline-block shrink-0 rounded-md border border-dashed border-primary-border bg-primary-tint',
        className,
      )}
    />
  )
}
