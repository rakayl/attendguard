import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NavItem = ({ path, icon, label, end = false }) => (
  <NavLink
    to={path}
    end={end}
    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
  >
    <span className="w-5 select-none text-center text-base leading-none">{icon}</span>
    <span className="text-sm">{label}</span>
  </NavLink>
)

const SectionLabel = ({ children }) => (
  <div className="mb-2 mt-5 px-4 text-[10px] font-mono uppercase tracking-widest text-slate-600">
    {children}
  </div>
)

const Sidebar = () => {
  const { user, logout, can } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role?.name === 'admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const showBoards = isAdmin || can('board:view')
  const showMonitoring = isAdmin || can('attendance:view_all') || can('attendance:view_fraud')
  const showAccessControl = isAdmin || can('user:view') || can('role:view') || can('permission:view')
  const showGeofence = isAdmin || can('geofence:manage')
  const showFace = isAdmin || can('face:manage')

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-lg font-bold text-slate-950">
            A
          </div>
          <div>
            <div className="font-display font-bold leading-none text-slate-100">AttendGuard</div>
            <div className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">Smart Attendance</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <SectionLabel>Main</SectionLabel>
        <NavItem path="/dashboard" icon="◻" label="Dashboard" />
        {showBoards && <NavItem path="/boards" icon="▤" label="Boards" />}
        {(isAdmin || can('activity:view')) && <NavItem path="/activities" icon="✎" label="Daily Activity" />}
        {(isAdmin || can('attendance:check_in') || can('attendance:check_out')) && <NavItem path="/checkin" icon="◎" label="Check In / Out" />}
        {(isAdmin || can('attendance:view_own')) && <NavItem path="/history" icon="≡" label="My History" />}
        {(isAdmin || can('device:view') || can('device:register')) && <NavItem path="/devices" icon="⬢" label="Devices" />}

        {showMonitoring && (
          <>
            <SectionLabel>Monitoring</SectionLabel>
            {(isAdmin || can('attendance:view_all')) && <NavItem path="/admin" icon="◈" label="All Attendance" end />}
            {(isAdmin || can('attendance:view_fraud')) && <NavItem path="/admin/fraud" icon="⊗" label="Fraud Monitor" />}
          </>
        )}

        {showGeofence && (
          <>
            <SectionLabel>Location</SectionLabel>
            <NavItem path="/admin/geofence" icon="⌖" label="Geofence Zones" />
          </>
        )}

        {showFace && (
          <>
            <SectionLabel>Biometric</SectionLabel>
            <NavItem path="/admin/face" icon="●" label="Face Recognition" />
          </>
        )}

        {showAccessControl && (
          <>
            <SectionLabel>Access Control</SectionLabel>
            {(isAdmin || can('user:view')) && <NavItem path="/admin/users" icon="◉" label="Users" />}
            {(isAdmin || can('role:view')) && <NavItem path="/admin/roles" icon="◇" label="Roles" />}
            {(isAdmin || can('permission:view')) && <NavItem path="/admin/permissions" icon="⊕" label="Permissions" />}
          </>
        )}
      </nav>

      <div className="border-t border-slate-800 px-3 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-800/50 px-3 py-3">
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${
              isAdmin ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-indigo-400 to-purple-500'
            }`}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-200">{user?.name}</div>
            <div className="truncate text-[10px] font-mono text-slate-500">{user?.role?.display_name || 'No Role'}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-lg leading-none text-slate-500 transition-colors hover:text-red-400"
            title="Logout"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
