import React, { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../store/authStore'

const Layout = () => {
  const { isAuthenticated, refreshMe } = useAuthStore()

  useEffect(() => {
    // Hydrate fresh user + permissions from server on each app load
    if (isAuthenticated) refreshMe()
  }, [])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
