import { NavLink } from 'react-router-dom'
import type { NavigationItem } from '../types/navigation'
import { useAuth } from '../../features/auth/useAuth'

export function Sidebar({ items }: { items: readonly NavigationItem[] }) {
  const { role } = useAuth()
  const visibleItems = items.filter((item) => role && item.allowedRoles.includes(role))
  return <nav className="sidebar-nav" aria-label="Navegación administrativa">
    {visibleItems.map((item) => <NavLink key={item.path} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`} to={item.path}>
      <span>{item.label}</span>{item.shortcut && <kbd aria-label={`Atajo ${item.shortcut}`}>{item.shortcut.replace('Ctrl+Alt+Shift+', '')}</kbd>}
    </NavLink>)}
  </nav>
}
