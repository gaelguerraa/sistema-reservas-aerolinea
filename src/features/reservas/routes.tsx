import type { FeatureModule } from '../../shared/types/navigation'

export const reservasFeature: FeatureModule = {
  navigation: [{ label: 'Reservas', path: '/app/reservas', allowedRoles: ['ADMIN'], shortcut: 'Ctrl+Alt+Shift+4' }],
  routes: [{ path: 'reservas/*', element: <section className="page-heading"><div><p className="eyebrow">RESERVAS</p><h1>En construcción</h1><p className="muted">El módulo lo implementará la Persona 4, sujeto al catálogo.</p></div></section> }],
}
