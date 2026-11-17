import { ApiError } from '../../shared/http/client'

export interface DashboardMetric {
  id: string
  label: string
  value: string
  description?: string
}

const fixtureMetrics: DashboardMetric[] = [
  { id: 'sample-1', label: 'Indicador de ejemplo 1', value: '—', description: 'Valor ilustrativo' },
  { id: 'sample-2', label: 'Indicador de ejemplo 2', value: '—', description: 'Valor ilustrativo' },
  { id: 'sample-3', label: 'Indicador de ejemplo 3', value: '—', description: 'Valor ilustrativo' },
]

export const dashboardApi = {
  async get(signal?: AbortSignal): Promise<DashboardMetric[]> {
    void signal
    if (import.meta.env.VITE_USE_FIXTURES === 'true') return fixtureMetrics
    // PENDIENTE: confirmar con Persona 5 el endpoint y las métricas antes de integrar el resumen.
    throw new ApiError({ status: 501, code: 'RESUMEN_PENDIENTE', message: 'El servicio todavía no ofrece el resumen del tablero. Persona 5 debe confirmar su contrato.' })
  },
}
