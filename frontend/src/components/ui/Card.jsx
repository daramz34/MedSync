import { cn } from '../../utils/cn.js'

export function Card({ className, children, ...rest }) {
  return (
    <section
      className={cn('rounded-md border border-line bg-surface shadow-sm', className)}
      {...rest}
    >
      {children}
    </section>
  )
}

export function CardHeader({ className, children, ...rest }) {
  return (
    <div className={cn('border-b border-line px-5 py-4', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...rest }) {
  return (
    <h2 className={cn('text-base font-semibold text-ink', className)} {...rest}>
      {children}
    </h2>
  )
}

export function CardBody({ className, children, ...rest }) {
  return (
    <div className={cn('px-5 py-4', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...rest }) {
  return (
    <div className={cn('border-t border-line px-5 py-4', className)} {...rest}>
      {children}
    </div>
  )
}

export default Card
