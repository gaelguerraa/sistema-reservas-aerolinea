import { api } from '../../shared/http/client'

export interface DashboardSummary {
  periodo: { desde: string; hasta: string }
  ocupacion: {
    asientosTotales: number
    asientosOcupados: number
    porcentaje: number
  }
  masSolicitados: Array<{
    vueloId: string
    origen: string
    destino: string
    reservas: number
  }>
  canceladas: number
}

export interface DashboardPeriod {
  desde: string
  hasta: string
}

// Datos deliberadamente ficticios para revisar la interfaz sin el servicio.
const fixtureSummary: DashboardSummary = {
  periodo: { desde: '2026-11-01', hasta: '2026-11-30' },
  ocupacion: { asientosTotales: 250, asientosOcupados: 184, porcentaje: 73.6 },
  masSolicitados: [
    { vueloId: 'VUELO-EJEMPLO-01', origen: 'Hermosillo', destino: 'Ciudad de México', reservas: 42 },
    { vueloId: 'VUELO-EJEMPLO-02', origen: 'Guadalajara', destino: 'Monterrey', reservas: 31 },
    { vueloId: 'VUELO-EJEMPLO-03', origen: 'Ciudad de México', destino: 'Mérida', reservas: 24 },
  ],
  canceladas: 8,
}

export const dashboardApi = {
  get(period: DashboardPeriod, signal?: AbortSignal): Promise<DashboardSummary> {
    if (import.meta.env.VITE_USE_FIXTURES === 'true') {
      return Promise.resolve({ ...fixtureSummary, periodo: period })
    }

    const query = new URLSearchParams({ desde: period.desde, hasta: period.hasta })
    return api.get<DashboardSummary>(`/admin/resumen?${query.toString()}`, { signal })
  },
}
