import type { FeatureModule } from '../../shared/types/navigation'

export const vuelosFeature: FeatureModule = {
  navigation: [{ label: 'Vuelos', path: '/app/vuelos', allowedRoles: ['ADMIN'], shortcut: 'Ctrl+Alt+Shift+2' }],
  routes: [
    { path: 'vuelos', element: <section className="page-heading"><div><p className="eyebrow">VUELOS</p><h1>En construcción</h1><p className="muted">El módulo lo implementará la Persona 2.</p></div></section> },
    { path: 'vuelos/nuevo', element: <section><h1>En construcción</h1></section> },
    { path: 'vuelos/:id', element: <section><h1>En construcción</h1></section> },
    { path: 'vuelos/:id/editar', element: <section><h1>En construcción</h1></section> },
  ],
}
