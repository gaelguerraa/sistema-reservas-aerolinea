import { useEffect, useMemo } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { featureNavigation } from '../../app/featureRegistry'
import { dashboardNavigation } from './navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AdminShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const mainId = 'main-content'
  const items = useMemo(() => [dashboardNavigation, ...featureNavigation], [])

  useEffect(() => {
    document.getElementById(mainId)?.focus()
  }, [location.key])

  useEffect(() => {
    // SUPUESTO: se usan combinaciones Ctrl+Alt+Shift+1–4 para reducir choques con atajos del navegador.
    function onShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey && event.altKey && event.shiftKey) || event.repeat) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      const shortcutTargets: Record<string, string> = { '1': '/app/dashboard', '2': '/app/vuelos', '3': '/app/pasajeros', '4': '/app/reservas' }
      const digit = event.code.startsWith('Digit') ? event.code.slice(5) : ''
      const path = shortcutTargets[digit]
      if (!path || !items.some((item) => item.path === path)) return
      event.preventDefault()
      navigate(path)
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [items, navigate])

  return <div className="admin-shell">
    <a className="skip-link" href={`#${mainId}`}>Saltar al contenido</a>
    <aside className="sidebar">
      <Link className="brand" to="/app/dashboard"><span className="brand-mark">A</span><span>Aerolínea<small>Administración</small></span></Link>
      <Sidebar items={items} />
      <p className="sidebar-footnote">Accesos rápidos: Ctrl + Alt + Shift + 1–4</p>
    </aside>
    <div className="admin-main-column">
      <Topbar />
      <main id={mainId} className="page-content" tabIndex={-1} aria-label="Contenido principal"><Outlet /></main>
    </div>
  </div>
}
