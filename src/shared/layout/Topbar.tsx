import { useAuth } from '../../features/auth/useAuth'

export function Topbar() {
  const { user, role, logout } = useAuth()
  return <header className="topbar">
    <div><p className="eyebrow">PANEL ADMINISTRATIVO</p><span className="topbar-user">{user?.email} <span className="role-pill">{role}</span></span></div>
    <button className="button button-secondary" type="button" onClick={() => logout()}>Cerrar sesión</button>
  </header>
}
