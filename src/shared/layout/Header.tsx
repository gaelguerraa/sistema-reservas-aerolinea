import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'

export function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/vuelos', { replace: true })
  }

  return (
    <header className="site-header">
      <Link className="brand" to="/vuelos" aria-label="Aerolínea, inicio">
        <span className="brand-mark" aria-hidden="true">A</span>
        <span>AEROLÍNEA<span className="brand-subtitle">VIAJA A TU MANERA</span></span>
      </Link>
      <nav className="header-nav" aria-label="Navegación principal">
        <NavLink to="/vuelos">Vuelos</NavLink>
        {isAuthenticated && <NavLink to="/reservas">Mis reservaciones</NavLink>}
      </nav>
      <div className="header-actions">
        <span className="header-note"><span className="status-dot" /> Portal de viajes</span>
        {isAuthenticated
          ? <><span className="user-greeting">{user?.email}</span><button className="header-button" type="button" onClick={handleLogout}>Cerrar sesión</button></>
          : <Link className="header-button" to="/login">Iniciar sesión</Link>}
      </div>
    </header>
  )
}
