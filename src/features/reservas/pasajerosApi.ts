import { api } from '../../shared/http/client'
import type { Pasajero } from '../../shared/types/api'
import { pasajerosMock } from './mocks'

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

export const pasajerosApi = {
  /** Datos de contacto del pasajero (el servicio solo deja ver los propios). */
  obtener(id: string, signal?: AbortSignal): Promise<Pasajero> {
    if (useMocks) return pasajerosMock.obtener(id, signal)
    return api.get<Pasajero>(`/pasajeros/${encodeURIComponent(id)}`, { signal })
  },
}
