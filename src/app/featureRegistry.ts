import type { FeatureModule } from '../shared/types/navigation'
import { vuelosFeature } from '../features/vuelos/routes'
import { pasajerosFeature } from '../features/pasajeros/routes'
import { reservasFeature } from '../features/reservas/routes'

// SUPUESTO: cada feature registra rutas y navegación exportando un FeatureModule desde routes.tsx.
export const featureRegistry: readonly FeatureModule[] = [vuelosFeature, pasajerosFeature, reservasFeature]
export const featureRoutes = featureRegistry.flatMap((feature) => feature.routes)
export const featureNavigation = featureRegistry.flatMap((feature) => feature.navigation)
