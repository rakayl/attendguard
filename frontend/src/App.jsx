import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CheckInPage from './pages/CheckInPage'
import HistoryPage from './pages/HistoryPage'
import DevicesPage from './pages/DevicesPage'
import AdminPage from './pages/AdminPage'
import FraudMonitorPage from './pages/FraudMonitorPage'
import UsersManagementPage from './pages/UsersManagementPage'
import RolesPage from './pages/RolesPage'
import PermissionsPage from './pages/PermissionsPage'
import GeofencePage from './pages/GeofencePage'
import FaceManagementPage from './pages/FaceManagementPage'
import { useAuthStore } from './store/authStore'

const RequireAuth = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const RequirePermission = ({ perm, children }) => {
  const { can, user } = useAuthStore()
  const isAdmin = user?.role?.name === 'admin'
  if (!isAdmin && !can(perm)) return <Navigate to="/dashboard" replace />
  return children
}

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="checkin" element={<CheckInPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="devices" element={<DevicesPage />} />

        {/* Monitoring */}
        <Route path="admin" element={<RequirePermission perm="attendance:view_all"><AdminPage /></RequirePermission>} />
        <Route path="admin/fraud" element={<RequirePermission perm="attendance:view_fraud"><FraudMonitorPage /></RequirePermission>} />

        {/* Access Control (RBAC) */}
        <Route path="admin/users" element={<RequirePermission perm="user:view"><UsersManagementPage /></RequirePermission>} />
        <Route path="admin/roles" element={<RequirePermission perm="role:view"><RolesPage /></RequirePermission>} />
        <Route path="admin/permissions" element={<RequirePermission perm="permission:view"><PermissionsPage /></RequirePermission>} />

        {/* Geofence */}
        <Route path="admin/geofence" element={<RequirePermission perm="geofence:manage"><GeofencePage /></RequirePermission>} />
        <Route path="admin/face" element={<RequirePermission perm="face:manage"><FaceManagementPage /></RequirePermission>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>
)

export default App
