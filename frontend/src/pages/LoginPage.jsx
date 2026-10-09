import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import Field from '../components/ui/Field.jsx'
import PasswordField from '../components/ui/PasswordField.jsx'
import Button from '../components/ui/Button.jsx'
import { auth } from '../services/auth.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const notice = location.state?.notice

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))

  function validate() {
    const next = {}
    if (!form.username.trim()) next.username = 'Enter your username'
    if (!form.password) next.password = 'Enter your password'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(event) {
    event.preventDefault()
    setFormError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      await auth.login({
        username: form.username.trim(),
        password: form.password,
      })

      // Return to wherever the guard bounced them from.
      const from = location.state?.from
      const destination =
        typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
          ? from
          : '/dashboard'

      navigate(destination, { replace: true })
    } catch (error) {
      setFormError(error?.message || 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your appointments, prescriptions and medication."
      footer={
        <>
          New patient?{' '}
          <Link to="/register" className="font-semibold text-primary hover:text-primary-hover">
            Create an account
          </Link>
        </>
      }
    >
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-line bg-primary-tint px-3.5 py-2.5 text-sm text-ink"
        >
          {notice}
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Field
          id="username"
          label="Username"
          required
          autoComplete="username"
          autoFocus
          value={form.username}
          onChange={set('username')}
          error={errors.username}
        />

        <PasswordField
          id="password"
          label="Password"
          required
          autoComplete="current-password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />

        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm font-medium text-danger"
          >
            {formError}
          </p>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
