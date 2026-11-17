import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Rol } from '../types/api'
import { useAuth } from '../../features/auth/useAuth'
import { AsyncState } from '../components/AsyncState'
import { ForbiddenPage } from '../components/ForbiddenPage'

export function ProtectedRoute({ allowedRoles }: { allowedRoles: readonly Rol[] }) {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <AsyncState state={{ status: 'loading' }}>
    {() => null}
  </AsyncState>
  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />
  }
  if (!allowedRoles.includes(user.rol)) return <ForbiddenPage />

  // Ocultar una opción no la protege; la autoridad real es el control de acceso del servicio.
  return <Outlet />
}
