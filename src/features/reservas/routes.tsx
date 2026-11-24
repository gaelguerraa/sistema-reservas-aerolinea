import type { FeatureModule } from '../../shared/types/navigation'
import { ReservaDetailPage } from './ReservaDetailPage'
import { ReservasListPage } from './ReservasListPage'

export const reservasFeature: FeatureModule = {
  navigation: [{ label: 'Reservas', path: '/app/reservas', allowedRoles: ['ADMIN'], shortcut: 'Ctrl+Alt+Shift+4' }],
  routes: [
    { path: 'reservas', element: <ReservasListPage /> },
    { path: 'reservas/:id', element: <ReservaDetailPage /> },
  ],
}
