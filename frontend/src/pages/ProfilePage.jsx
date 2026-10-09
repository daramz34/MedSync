import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import Icon from '../components/ui/Icon.jsx'
import Card, { CardBody } from '../components/ui/Card.jsx'
import Field from '../components/ui/Field.jsx'
import PasswordField from '../components/ui/PasswordField.jsx'
import Modal from '../components/ui/Modal.jsx'
import { auth } from '../services/auth.js'
import Avatar from '../components/ui/Avatar.jsx'


const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

function initialsOf(fullName) {
  const parts = String(fullName || 'Patient').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'P'
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function formatLongDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function SectionCard({ title, description, children }) {
  return (
    <Card className="h-full">
      <CardBody>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        <div className="mt-5">{children}</div>
      </CardBody>
    </Card>
  )
}

function ReadOnlyRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line py-3 first:border-t-0 first:pt-0">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}

function Notice({ tone = 'success', children }) {
  const styles =
    tone === 'danger'
      ? 'border-danger-border bg-danger-tint text-danger'
      : 'border-primary-border bg-primary-tint text-primary'

  return (
    <p
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`rounded-lg border px-3.5 py-2.5 text-sm font-medium ${styles}`}
    >
      {children}
    </p>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [user, setUser] = useState(() => auth.getStoredUser())
  const [loading, setLoading] = useState(!auth.getStoredUser())
  const [loadError, setLoadError] = useState('')

  /* details form */
  const [details, setDetails] = useState({ full_name: '', phone_number: '' })
  const [detailsErrors, setDetailsErrors] = useState({})
  const [detailsNotice, setDetailsNotice] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)

  /* picture */
  const [pictureError, setPictureError] = useState('')
  const [pictureNotice, setPictureNotice] = useState('')
  const [uploading, setUploading] = useState(false)
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)

  /* password */
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [changingPassword, setChangingPassword] = useState(false)

  async function load() {
    setLoadError('')
    try {
      const fresh = await auth.getCurrentUser()
      setUser(fresh)
    } catch (error) {
      setLoadError(error?.message || 'Could not load your profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the details form in step with whichever user we have.
  useEffect(() => {
    if (!user) return
    setDetails({
      full_name: user.full_name || '',
      phone_number: user.phone_number || '',
    })
  }, [user])

  /* ---------- details ---------- */

  function onDetailsChange(event) {
    const { name, value } = event.target
    setDetails((current) => ({ ...current, [name]: value }))
    setDetailsErrors((current) => ({ ...current, [name]: '' }))
    setDetailsNotice('')
  }

  async function onSaveDetails(event) {
    event.preventDefault()
    setDetailsNotice('')

    const next = {}
    if (!details.full_name.trim()) next.full_name = 'Enter your full name.'
    if (!details.phone_number.trim()) next.phone_number = 'Enter your phone number.'
    else if (!/^[+]?[\d\s().-]{7,20}$/.test(details.phone_number.trim())) {
      next.phone_number = 'Enter a valid phone number.'
    }

    setDetailsErrors(next)
    if (Object.keys(next).length) return

    setSavingDetails(true)
    try {
      const updated = await auth.updateProfile({
        full_name: details.full_name.trim(),
        phone_number: details.phone_number.trim(),
      })
      setUser(updated)
      setDetailsNotice('Your details have been saved.')
    } catch (error) {
      setDetailsErrors({ form: error?.message || 'Could not save your details.' })
    } finally {
      setSavingDetails(false)
    }
  }

  /* ---------- picture ---------- */

  function onPickFile() {
    setPictureError('')
    setPictureNotice('')
    fileInputRef.current?.click()
  }

  async function onFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-picking the same file
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setPictureError('Choose a JPG, PNG or WebP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setPictureError('That image is larger than 5 MB. Choose a smaller file.')
      return
    }

    setUploading(true)
    setPictureError('')
    try {
      const updated = await auth.uploadProfilePicture(file)
      setUser(updated)
      setPictureNotice('Your profile picture has been updated.')
    } catch (error) {
      setPictureError(error?.message || 'Could not upload that image.')
    } finally {
      setUploading(false)
    }
  }

  async function onRemovePicture() {
    setConfirmRemoveOpen(false)
    setUploading(true)
    setPictureError('')
    try {
      const updated = await auth.removeProfilePicture()
      setUser(updated)
      setPictureNotice('Your profile picture has been removed.')
    } catch (error) {
      setPictureError(error?.message || 'Could not remove your picture.')
    } finally {
      setUploading(false)
    }
  }

  /* ---------- password ---------- */

  function onPasswordChange(event) {
    const { name, value } = event.target
    setPasswords((current) => ({ ...current, [name]: value }))
    setPasswordErrors((current) => ({ ...current, [name]: '' }))
  }

  async function onChangePassword(event) {
    event.preventDefault()

    const next = {}
    if (!passwords.current_password) {
      next.current_password = 'Enter your current password.'
    }
    if (passwords.new_password.length < 8) {
      next.new_password = 'Use a password with at least 8 characters.'
    } else if (passwords.new_password === passwords.current_password) {
      next.new_password = 'Choose a password different from your current one.'
    }
    if (passwords.new_password !== passwords.confirm_password) {
      next.confirm_password = 'The two passwords do not match.'
    }

    setPasswordErrors(next)
    if (Object.keys(next).length) return

    setChangingPassword(true)
    try {
      await auth.changePassword({
        currentPassword: passwords.current_password,
        newPassword: passwords.new_password,
      })

      // The backend revokes every refresh token on a password change, so the
      // session is no longer usable. Sign out cleanly and send them back.
      await auth.logout()
      navigate('/login', {
        replace: true,
        state: { notice: 'Your password was changed. Please sign in again.' },
      })
      return // don't touch state — we're unmounting
    } catch (error) {
      setPasswordErrors({
        form: error?.message || 'Could not change your password.',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  /* ---------- render ---------- */

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded bg-background" />
        <div className="mt-8 grid gap-5">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="h-40 animate-pulse rounded-2xl border border-line bg-background"
            />
          ))}
        </div>
      </div>
    )
  }

  if (loadError && !user) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10">
        <Notice tone="danger">{loadError}</Notice>
        <div className="mt-5">
          <Button variant="secondary" onClick={load}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const initials = initialsOf(user?.full_name)

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Your profile
      </h1>
      <p className="mt-1 text-sm text-muted">
        Manage your account details, picture and password.
      </p>

      <div className="mt-8 grid gap-5">
        {/* Account summary */}
        <SectionCard title="Account">
          <div className="flex items-center gap-4">
            <Avatar user={user} size="lg" />

            
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-ink">
                {user?.full_name || 'Patient'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-primary-border bg-primary-tint px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">
                  {String(user?.role || 'patient').toLowerCase().split('.').pop()}
                </span>
                {user?.username && (
                  <span className="text-sm text-muted">@{user.username}</span>
                )}
              </div>
            </div>
          </div>

          <dl className="mt-6">
            <ReadOnlyRow label="Username" value={user?.username || '—'} />
            <ReadOnlyRow label="Email" value={user?.email || '—'} />
            <ReadOnlyRow label="Member since" value={formatLongDate(user?.created_at)} />
          </dl>
        </SectionCard>

        {/* Details */}
        <SectionCard
          title="Your details"
          description="Your name and phone number. Username and email cannot be changed."
        >
          <form onSubmit={onSaveDetails} noValidate className="grid gap-5">
            <Field
              id="full_name"
              name="full_name"
              label="Full name"
              autoComplete="name"
              value={details.full_name}
              onChange={onDetailsChange}
              error={detailsErrors.full_name}
              required
            />

            <Field
              id="phone_number"
              name="phone_number"
              type="tel"
              label="Phone number"
              autoComplete="tel"
              value={details.phone_number}
              onChange={onDetailsChange}
              error={detailsErrors.phone_number}
              required
            />

            {detailsErrors.form && <Notice tone="danger">{detailsErrors.form}</Notice>}
            {detailsNotice && <Notice>{detailsNotice}</Notice>}

            <div>
              <Button type="submit" loading={savingDetails}>
                {savingDetails ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </SectionCard>

        {/* Picture */}
        <SectionCard
          title="Profile picture"
          description="A JPG, PNG or WebP image, up to 5 MB."
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            className="sr-only"
          />

          {pictureError && (
            <div className="mb-4">
              <Notice tone="danger">{pictureError}</Notice>
            </div>
          )}
          {pictureNotice && (
            <div className="mb-4">
              <Notice>{pictureNotice}</Notice>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onPickFile}
              loading={uploading}
            >
              {user?.profile_picture_url ? 'Change picture' : 'Upload picture'}
            </Button>

            {user?.profile_picture_url && (
              <Button
                type="button"
                variant="danger"
                onClick={() => setConfirmRemoveOpen(true)}
                disabled={uploading}
              >
                Remove picture
              </Button>
            )}
          </div>
        </SectionCard>

        {/* Password */}
        <SectionCard
          title="Password"
          description="Choose a password you do not use anywhere else."
        >
          <form onSubmit={onChangePassword} noValidate className="grid gap-5">
            <PasswordField
              id="current_password"
              name="current_password"
              label="Current password"
              autoComplete="current-password"
              value={passwords.current_password}
              onChange={onPasswordChange}
              error={passwordErrors.current_password}
              required
            />

            <PasswordField
              id="new_password"
              name="new_password"
              label="New password"
              autoComplete="new-password"
              value={passwords.new_password}
              onChange={onPasswordChange}
              error={passwordErrors.new_password}
              required
            />

            <PasswordField
              id="confirm_password"
              name="confirm_password"
              label="Confirm new password"
              autoComplete="new-password"
              value={passwords.confirm_password}
              onChange={onPasswordChange}
              error={passwordErrors.confirm_password}
              required
            />

            {passwordErrors.form && <Notice tone="danger">{passwordErrors.form}</Notice>}

            <p className="flex items-start gap-2.5 text-sm leading-6 text-muted">
              <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-muted" />
              <span>Changing your password signs you out of all devices.</span>
            </p>

            <div>
              <Button type="submit" loading={changingPassword}>
                {changingPassword ? 'Changing…' : 'Change password'}
              </Button>
            </div>
          </form>
        </SectionCard>
      </div>

      <Modal
        open={confirmRemoveOpen}
        onClose={() => setConfirmRemoveOpen(false)}
        title="Remove your profile picture?"
        description="Your initials will be shown instead. You can upload a new picture at any time."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemoveOpen(false)}>
              Keep picture
            </Button>
            <Button variant="danger" onClick={onRemovePicture}>
              Remove picture
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This removes the image from your account and from storage.
        </p>
      </Modal>
    </div>
  )
}
