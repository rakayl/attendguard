import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NavItem = ({ path, icon, label, end = false }) => (
  <NavLink
    to={path}
    end={end}
    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
  >
    <span className="text-base w-5 text-center leading-none select-none">{icon}</span>
    <span className="text-sm">{label}</span>
  </NavLink>
)

const SectionLabel = ({ children }) => (
  <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest px-4 mb-2 mt-5">
    {children}
  </div>
)

const Sidebar = () => {
  const { user, logout, can } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role?.name === 'admin'

  const handleLogout = () => { logout(); navigate('/login') }

  const showMonitoring = isAdmin || can('attendance:view_all') || can('attendance:view_fraud')
  const showAccessControl = isAdmin || can('user:view') || can('role:view') || can('permission:view')
  const showGeofence = isAdmin || can('geofence:manage')
  const showFace = isAdmin || can('face:manage')

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-slate-950 font-bold text-lg">
            A
          </div>
          <div>
            <div className="font-display font-bold text-slate-100 leading-none">AttendGuard</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">Smart Attendance</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <SectionLabel>Main</SectionLabel>
        <NavItem path="/dashboard" icon="⬡" label="Dashboard" />
        {(isAdmin || can('attendance:check_in') || can('attendance:check_out')) && (
          <NavItem path="/checkin" icon="◎" label="Check In / Out" />
        )}
        {(isAdmin || can('attendance:view_own')) && (
          <NavItem path="/history" icon="≡" label="My History" />
        )}
        {(isAdmin || can('device:view') || can('device:register')) && (
          <NavItem path="/devices" icon="⬕" label="Devices" />
        )}

        {/* Monitoring */}
        {showMonitoring && (
          <>
            <SectionLabel>Monitoring</SectionLabel>
            {(isAdmin || can('attendance:view_all')) && (
              <NavItem path="/admin" icon="◈" label="All Attendance" end />
            )}
            {(isAdmin || can('attendance:view_fraud')) && (
              <NavItem path="/admin/fraud" icon="⊗" label="Fraud Monitor" />
            )}
          </>
        )}

        {/* Geofence */}
        {showGeofence && (
          <>
            <SectionLabel>Location</SectionLabel>
            <NavItem path="/admin/geofence" icon="⬡" label="Geofence Zones" />
          </>
        )}

        {showFace && (
          <>
            <SectionLabel>Biometric</SectionLabel>
            <NavItem path="/admin/face" icon="●" label="Face Recognition" />
          </>
        )}

        {/* RBAC management */}
        {showAccessControl && (
          <>
            <SectionLabel>Access Control</SectionLabel>
            {(isAdmin || can('user:view')) && (
              <NavItem path="/admin/users" icon="◉" label="Users" />
            )}
            {(isAdmin || can('role:view')) && (
              <NavItem path="/admin/roles" icon="◈" label="Roles" />
            )}
            {(isAdmin || can('permission:view')) && (
              <NavItem path="/admin/permissions" icon="⊕" label="Permissions" />
            )}
          </>
        )}
      </nav>

      {/* User card */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800/50">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0
            ${isAdmin ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-indigo-400 to-purple-500'}`}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">{user?.name}</div>
            <div className="text-[10px] text-slate-500 font-mono truncate">
              {user?.role?.display_name || 'No Role'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-400 transition-colors text-lg leading-none"
            title="Logout"
          >
            ⏏
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
