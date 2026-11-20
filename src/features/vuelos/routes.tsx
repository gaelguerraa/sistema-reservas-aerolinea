import type { FeatureModule } from '../../shared/types/navigation'
import { VueloDetailPage } from './VueloDetailPage'
import { VueloFormPage } from './VueloFormPage'
import { VuelosListPage } from './VuelosListPage'

export const vuelosFeature: FeatureModule = {
  navigation: [{ label: 'Vuelos', path: '/app/vuelos', allowedRoles: ['ADMIN'], shortcut: 'Ctrl+Alt+Shift+2' }],
  routes: [
    { path: 'vuelos', element: <VuelosListPage /> },
    { path: 'vuelos/nuevo', element: <VueloFormPage /> },
    { path: 'vuelos/:id', element: <VueloDetailPage /> },
    { path: 'vuelos/:id/editar', element: <VueloFormPage /> },
  ],
}
