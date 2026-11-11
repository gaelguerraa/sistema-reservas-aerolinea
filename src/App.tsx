import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider'
import { useAuth } from './features/auth/useAuth'
import { LoginPage } from './features/auth/pages/LoginPage'
import { VuelosListPage } from './features/vuelos/pages/VuelosListPage'
import { VueloDetallePage } from './features/vuelos/pages/VueloDetallePage'
import { Footer } from './shared/layout/Footer'
import { Header } from './shared/layout/Header'
import { SessionNotice } from './shared/layout/SessionNotice'
import { ProtectedRoute } from './shared/routing/ProtectedRoute'
import './App.css'

function NotFoundPage() {
  return (
    <main className="not-found">
      <span className="eyebrow">RUTA NO DISPONIBLE</span>
      <h1>No encontramos esta página</h1>
      <p>Revisa la dirección o vuelve a explorar los vuelos disponibles.</p>
      <Link className="button button-primary" to="/vuelos">Volver al inicio</Link>
    </main>
  )
}

function ReservationPlaceholder() {
  const { user } = useAuth()

  return (
    <main className="page-content reservation-placeholder">
      <span className="eyebrow">TU CUENTA</span>
      <h1>Reservaciones</h1>
      <p>Sesión iniciada como {user?.email}. Esta pantalla se integrará con el flujo de reservaciones.</p>
      <Link className="button button-secondary" to="/vuelos">Explorar vuelos</Link>
    </main>
  )
}

function AppLayout() {
  return (
    <div className="app-shell">
      <Header />
      <SessionNotice />
      <Outlet />
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/vuelos" replace />} />
            <Route path="/vuelos" element={<VuelosListPage />} />
            <Route path="/vuelos/:id" element={<VueloDetallePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/reservas" element={<ReservationPlaceholder />} />
              <Route path="/reservar" element={<ReservationPlaceholder />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
