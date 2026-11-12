import { api } from '../../shared/http/client'
import type { Pasajero } from '../../shared/types/api'


export const pasajerosApi = {

  obtener(id: string, signal?: AbortSignal): Promise<Pasajero> {
    return api.get<Pasajero>(`/pasajeros/${encodeURIComponent(id)}`, { signal })
  },
}
