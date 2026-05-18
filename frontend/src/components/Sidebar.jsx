import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NavItem = ({ path, icon, label, end = false }) => (
  <NavLink
    to={path}
    end={end}
    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
  >
    <span className="w-5 flex-shrink-0 select-none text-center text-base leading-none">{icon}</span>
    <span className="min-w-0 text-sm">{label}</span>
  </NavLink>
)

const SectionLabel = ({ children }) => (
  <div className="mb-2 mt-5 px-4 text-[10px] font-mono uppercase tracking-widest text-slate-600">
    {children}
  </div>
)

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, can } = useAuthStore()
  const isAdmin = user?.role?.name === 'admin'

  const showTeams = isAdmin || can('team:view')
  const showMonitoring = isAdmin || can('attendance:view_all') || can('attendance:view_fraud')
  const showAccessControl = isAdmin || can('user:view') || can('role:view') || can('permission:view')
  const showGeofence = isAdmin || can('geofence:manage')
  const showFace = isAdmin || can('face:manage')

  return (
    <>
      {isOpen && <button type="button" className="fixed inset-0 z-30 bg-black/75 lg:hidden" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[88vw] max-w-[320px] flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900 shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-0 lg:m-4 lg:h-[calc(100vh-2rem)] lg:w-[290px] lg:max-w-none lg:rounded-[28px] lg:border ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="border-b border-slate-800 px-5 py-5 lg:px-6 lg:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-500 text-lg font-bold text-slate-950 shadow-lg shadow-cyan-500/20">
            AG
          </div>
          <div>
            <div className="font-display font-bold leading-none text-slate-100">AttendGuard</div>
            <div className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">Security Workspace</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 lg:px-4 lg:py-5">
        <SectionLabel>Main</SectionLabel>
        <NavItem path="/dashboard" icon="D" label="Dashboard" />
        {showTeams && <NavItem path="/teams" icon="T" label="Teams" />}
        {(isAdmin || can('activity:view')) && <NavItem path="/activities" icon="A" label="Daily Activity" />}
        {(isAdmin || can('attendance:check_in') || can('attendance:check_out')) && <NavItem path="/checkin" icon="C" label="Check In / Out" />}
        {(isAdmin || can('attendance:view_own')) && <NavItem path="/history" icon="H" label="My History" />}
        {(isAdmin || can('device:view') || can('device:register')) && <NavItem path="/devices" icon="M" label="Devices" />}
        {showMonitoring && (
          <>
            <SectionLabel>Monitoring</SectionLabel>
            {(isAdmin || can('attendance:view_all')) && <NavItem path="/admin" icon="A" label="All Attendance" end />}
            {(isAdmin || can('attendance:view_fraud')) && <NavItem path="/admin/fraud" icon="F" label="Fraud Monitor" />}
          </>
        )}

        {showGeofence && (
          <>
            <SectionLabel>Location</SectionLabel>
            <NavItem path="/admin/geofence" icon="G" label="Geofence Zones" />
          </>
        )}

        {showFace && (
          <>
            <SectionLabel>Biometric</SectionLabel>
            <NavItem path="/admin/face" icon="R" label="Face Recognition" />
          </>
        )}

        {showAccessControl && (
          <>
            <SectionLabel>Access Control</SectionLabel>
            {(isAdmin || can('user:view')) && <NavItem path="/admin/users" icon="U" label="Users" />}
            {(isAdmin || can('role:view')) && <NavItem path="/admin/roles" icon="R" label="Roles" />}
            {(isAdmin || can('permission:view')) && <NavItem path="/admin/permissions" icon="P" label="Permissions" />}
          </>
        )}
      </nav>

      <div className="border-t border-slate-800 px-3 py-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-800 px-4 py-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${
              isAdmin ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-indigo-400 to-purple-500'
            }`}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-200">{user?.name}</div>
            <div className="truncate text-[10px] font-mono text-slate-500">{user?.role?.display_name || 'No Role'}</div>
          </div>
        </div>
      </div>
      </aside>
    </>
  )
}

export default Sidebar
