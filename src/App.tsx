import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/pages/LoginPage'
import { MisReservasPage } from './features/reservas/pages/MisReservasPage'
import { ReservaDetallePage } from './features/reservas/pages/ReservaDetallePage'
import { ReservarPage } from './features/reservas/pages/ReservarPage'
import { VuelosListPage } from './features/vuelos/pages/VuelosListPage'
import { VueloDetallePage } from './features/vuelos/pages/VueloDetallePage'
import { Footer } from './shared/layout/Footer'
import { Header } from './shared/layout/Header'
import { SessionNotice } from './shared/layout/SessionNotice'
import { ProtectedRoute } from './shared/routing/ProtectedRoute'
import { useAuth } from './features/auth/useAuth'
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

function AppLayout() {
  const location = useLocation()
  const { user } = useAuth()
  const key = `${user?.id ?? "publico"}:${location.pathname}:${location.pathname === "/reservar" ? new URLSearchParams(location.search).get("vueloId") : ""}`
  return (
    <div className="app-shell">
      <Header />
      <SessionNotice />
      <Outlet key={key} />
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
              <Route path="/reservas" element={<MisReservasPage />} />
              <Route path="/reservas/:id" element={<ReservaDetallePage />} />
              <Route path="/reservar" element={<ReservarPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
