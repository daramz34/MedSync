import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/layout/AuthLayout.jsx'
import Field from '../components/ui/Field.jsx'
import PasswordField from '../components/ui/PasswordField.jsx'
import Button from '../components/ui/Button.jsx'
import { auth } from '../services/auth.js'

const INITIAL_FORM = {
  username: '',
  full_name: '',
  email: '',
  password: '',
  phone_number: '',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setFormError('')
  }

  function validate() {
    const nextErrors = {}
    const username = form.username.trim()
    const fullName = form.full_name.trim()
    const email = form.email.trim()
    const phone = form.phone_number.trim()

    if (!username) nextErrors.username = 'Enter a username.'
    if (!fullName) nextErrors.full_name = 'Enter your full name.'

    if (!email) {
      nextErrors.email = 'Enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (form.password.length < 8) {
      nextErrors.password = 'Use a password with at least 8 characters.'
    }

    if (!phone) {
      nextErrors.phone_number = 'Enter your phone number.'
    } else if (!/^[+]?[\d\s().-]{7,20}$/.test(phone)) {
      nextErrors.phone_number = 'Enter a valid phone number.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (!validate()) return

    const payload = {
      username: form.username.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone_number: form.phone_number.trim(),
    }

    setSubmitting(true)

    try {
      await auth.register(payload)
      navigate('/login', {
        replace: true,
        state: { message: 'Your account was created. You can now sign in.' },
      })
    } catch (error) {
      setFormError(error?.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Create a patient account
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Register to manage appointments, prescriptions, and medication reminders.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-danger px-3.5 py-3 text-sm text-danger"
          >
            {formError}
          </p>
        )}

        <Field
          id="full_name"
          name="full_name"
          label="Full name"
          autoComplete="name"
          value={form.full_name}
          onChange={updateField}
          error={errors.full_name}
          required
        />

        <Field
          id="username"
          name="username"
          label="Username"
          autoComplete="username"
          value={form.username}
          onChange={updateField}
          error={errors.username}
          required
        />

        <Field
          id="email"
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          value={form.email}
          onChange={updateField}
          error={errors.email}
          required
        />

        <Field
          id="phone_number"
          name="phone_number"
          type="tel"
          label="Phone number"
          autoComplete="tel"
          value={form.phone_number}
          onChange={updateField}
          error={errors.phone_number}
          required
        />

        <PasswordField
          id="password"
          name="password"
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={updateField}
          error={errors.password}
          required
        />

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:text-primary-hover">
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-xs leading-5 text-muted">
        Doctor accounts are created by a clinic administrator.
      </p>
    </AuthLayout>
  )
}
