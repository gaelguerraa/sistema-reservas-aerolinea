import { api, isAbortError } from '../../shared/http/client'
import type { ApiError } from '../../shared/http/client'
import type { Asiento, Vuelo, VueloDetalle } from './types'

export const vuelosApi = {
  list: (signal?: AbortSignal) => api.get<Vuelo[]>('/vuelos', { signal }),
  get: (id: string, signal?: AbortSignal) => api.get<VueloDetalle>(`/vuelos/${encodeURIComponent(id)}`, { signal }),
  seats: (id: string, signal?: AbortSignal) => api.get<Asiento[]>(`/vuelos/${encodeURIComponent(id)}/asientos`, { signal }),
}

export { isAbortError }

export function getApiErrorStatus(error: unknown): number | undefined {
  return (error as ApiError | null)?.status
}
