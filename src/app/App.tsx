import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ForbiddenPage } from '../shared/components/ForbiddenPage'
import { NotFoundPage } from '../shared/components/NotFoundPage'
import { AdminShell } from '../shared/layout/AdminShell'
import { ProtectedRoute } from '../shared/routing/ProtectedRoute'
import { featureRoutes } from './featureRegistry'

// SUPUESTO: la rama de administración se creó huérfana porque master contiene un starter Vite; así no hereda archivos de otra app.
const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthProvider><Outlet /></AuthProvider>,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: '403', element: <ForbiddenPage /> },
      { path: '404', element: <NotFoundPage /> },
      {
        element: <ProtectedRoute allowedRoles={['ADMIN']} />,
        children: [{
          path: 'app',
          element: <AdminShell />,
          children: [
            { index: true, element: <Navigate to="/app/dashboard" replace /> },
            { path: 'dashboard', element: <DashboardPage /> },
            ...featureRoutes,
          ],
        }],
      },
      { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
