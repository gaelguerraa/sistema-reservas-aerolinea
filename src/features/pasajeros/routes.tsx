import type { FeatureModule } from '../../shared/types/navigation'

export const pasajerosFeature: FeatureModule = {
  navigation: [{ label: 'Pasajeros', path: '/app/pasajeros', allowedRoles: ['ADMIN'], shortcut: 'Ctrl+Alt+Shift+3' }],
  routes: [{ path: 'pasajeros/*', element: <section className="page-heading"><div><p className="eyebrow">PASAJEROS</p><h1>En construcción</h1><p className="muted">El módulo lo implementará la Persona 3, sujeto al catálogo.</p></div></section> }],
}
