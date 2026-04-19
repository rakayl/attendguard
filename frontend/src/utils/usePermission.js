import { useAuthStore } from '../store/authStore'

/**
 * Hook to check if the current user has a given permission.
 * System admins (role.name === 'admin') pass all checks.
 */
export const usePermission = () => {
  const { user } = useAuthStore()
  const isAdmin = user?.role?.name === 'admin'
  const permissions = user?.role?.permissions?.map((p) => p.name) || []

  const can = (perm) => {
    if (isAdmin) return true
    return permissions.includes(perm)
  }

  const canAny = (...perms) => perms.some((p) => can(p))
  const canAll = (...perms) => perms.every((p) => can(p))

  return { can, canAny, canAll, isAdmin, permissions }
}

/**
 * Component wrapper: renders children only if user has permission
 */
export const Can = ({ permission, children, fallback = null }) => {
  const { can } = usePermission()
  return can(permission) ? children : fallback
}
