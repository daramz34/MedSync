import { useState } from 'react'
import Field from './Field.jsx'

export default function PasswordField({ id, label, error, hint, required, ...rest }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Field
        id={id}
        label={label}
        error={error}
        hint={hint}
        required={required}
        type={visible ? 'text' : 'password'}
        className="[&>input]:pr-16"
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-[30px] rounded-md px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
