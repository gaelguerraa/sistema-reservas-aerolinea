import type { NavigationItem } from '../types/navigation'

export const dashboardNavigation: NavigationItem = {
  label: 'Tablero',
  path: '/app/dashboard',
  allowedRoles: ['ADMIN'],
  shortcut: 'Ctrl+Alt+Shift+1',
}
