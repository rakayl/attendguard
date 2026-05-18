import React, { useEffect, useRef, useState } from 'react'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../store/authStore'

const Layout = () => {
  const { isAuthenticated, refreshMe, user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const mobileAccountMenuRef = useRef(null)
  const desktopAccountMenuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Hydrate fresh user + permissions from server on each app load
    if (isAuthenticated) refreshMe()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedMobileMenu = mobileAccountMenuRef.current?.contains(event.target)
      const clickedDesktopMenu = desktopAccountMenuRef.current?.contains(event.target)
      if (!clickedMobileMenu && !clickedDesktopMenu) {
        setAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const handleProfileClick = () => {
    setAccountMenuOpen(false)
    navigate('/profile')
  }

  const handleLogout = () => {
    setAccountMenuOpen(false)
    logout()
    navigate('/login')
  }

  const accountInitial = user?.name?.[0]?.toUpperCase() || 'U'

  return (
    <div className="min-h-screen overflow-x-clip bg-slate-950 lg:flex">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 shadow-sm lg:hidden">
        <div>
          <div className="font-display text-lg font-bold text-slate-100">AttendGuard</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Fraud-Proof Attendance</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={mobileAccountMenuRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm text-slate-200"
              onClick={() => setAccountMenuOpen((current) => !current)}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-sky-500 text-xs font-bold text-slate-950">
                {accountInitial}
              </span>
              <span className="hidden max-w-[96px] truncate sm:block">{user?.name || 'Account'}</span>
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                <button
                  type="button"
                  onClick={handleProfileClick}
                  className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200"
            onClick={() => setSidebarOpen((current) => !current)}
          >
            {sidebarOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="sticky top-0 z-20 hidden border-b border-slate-800 bg-slate-900 px-6 py-4 shadow-sm lg:block">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-slate-500">AttendGuard Control Center</div>
              <div className="mt-1 font-display text-xl font-bold text-slate-100">Operations Dashboard</div>
            </div>
            <div className="relative" ref={desktopAccountMenuRef}>
              <button
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 px-3 py-2 text-left shadow-sm transition hover:border-slate-600"
                onClick={() => setAccountMenuOpen((current) => !current)}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-500 text-sm font-bold text-slate-950">
                  {accountInitial}
                </span>
                <span className="min-w-0">
                  <span className="block max-w-[180px] truncate text-sm font-semibold text-slate-100">{user?.name || 'Account'}</span>
                  <span className="block max-w-[180px] truncate text-[11px] text-slate-500">{user?.role?.display_name || 'User'}</span>
                </span>
                <span className="text-xs text-slate-500">▾</span>
              </button>
              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-48 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                  <button
                    type="button"
                    onClick={handleProfileClick}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="animate-fade-in p-0 lg:p-6">
          <div className="min-h-[calc(100vh-112px)] overflow-x-hidden rounded-none lg:rounded-[28px] lg:border lg:border-slate-800 lg:bg-slate-950/40">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Layout
