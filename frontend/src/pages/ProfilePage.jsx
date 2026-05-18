import React, { useEffect, useState } from 'react'
import { changeMyPassword, updateMyProfile } from '../api/services'
import { useAuthStore } from '../store/authStore'

const ProfilePage = () => {
  const { user, refreshMe, updateUser } = useAuthStore()
  const [profileForm, setProfileForm] = useState({ name: '' })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    setProfileForm({ name: user?.name || '' })
  }, [user?.name])

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileLoading(true)
    setProfileError('')
    setProfileMessage('')
    try {
      const res = await updateMyProfile({ name: profileForm.name })
      updateUser(res.data.user)
      await refreshMe()
      setProfileMessage(res.data.message || 'Profile updated successfully')
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordMessage('')

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordLoading(false)
      setPasswordError('Password confirmation does not match')
      return
    }

    try {
      const res = await changeMyPassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setPasswordMessage(res.data.message || 'Password updated successfully')
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="card px-5 py-6 sm:px-6">
        <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-slate-500">Account</div>
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-100 sm:text-3xl">Profile Settings</h1>
        <p className="mt-2 text-sm text-slate-400">Update your display name and change your account password.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="card p-5 sm:p-6">
          <div className="mb-5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Personal Info</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">Update Profile</div>
          </div>

          {profileError && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{profileError}</div>}
          {profileMessage && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{profileMessage}</div>}

          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-slate-400">Full Name</label>
              <input
                className="input-field"
                value={profileForm.name}
                onChange={(event) => setProfileForm({ name: event.target.value })}
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-slate-400">Email</label>
              <input className="input-field opacity-80" value={user?.email || ''} readOnly />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-slate-400">Role</label>
              <input className="input-field opacity-80" value={user?.role?.display_name || user?.role?.name || '-'} readOnly />
            </div>

            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={profileLoading}>
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Security</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">Change Password</div>
          </div>

          {passwordError && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{passwordError}</div>}
          {passwordMessage && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{passwordMessage}</div>}

          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-slate-400">Current Password</label>
              <input
                type="password"
                className="input-field"
                value={passwordForm.current_password}
                onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-slate-400">New Password</label>
              <input
                type="password"
                className="input-field"
                value={passwordForm.new_password}
                onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))}
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-slate-400">Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                value={passwordForm.confirm_password}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={passwordLoading}>
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

export default ProfilePage
