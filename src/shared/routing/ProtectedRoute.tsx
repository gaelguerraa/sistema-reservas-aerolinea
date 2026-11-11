import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (isAuthenticated) return <Outlet />

  const redirect = `${location.pathname}${location.search}${location.hash}`
  return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />
}
