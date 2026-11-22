import type { FeatureModule } from '../../shared/types/navigation'
import { PasajeroDetailPage } from './PasajeroDetailPage'
import { PasajeroFormPage } from './PasajeroFormPage'
import { PasajerosListPage } from './PasajerosListPage'

export const pasajerosFeature: FeatureModule = {
  navigation: [{ label: 'Pasajeros', path: '/app/pasajeros', allowedRoles: ['ADMIN'], shortcut: 'Ctrl+Alt+Shift+3' }],
  routes: [
    { path: 'pasajeros', element: <PasajerosListPage /> },
    { path: 'pasajeros/nuevo', element: <PasajeroFormPage /> },
    { path: 'pasajeros/:id', element: <PasajeroDetailPage /> },
    { path: 'pasajeros/:id/editar', element: <PasajeroFormPage /> },
  ],
}
