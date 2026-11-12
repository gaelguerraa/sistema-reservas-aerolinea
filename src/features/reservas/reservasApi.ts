import { api } from '../../shared/http/client'
import type { CrearReservaBody, EstadoReserva, Reserva } from '../../shared/types/api'


export const reservasApi = {
  crear(body: CrearReservaBody, signal?: AbortSignal): Promise<Reserva> {
    return api.post<Reserva>('/reservas', body, { signal })
  },
  obtener(id: string, signal?: AbortSignal): Promise<Reserva> {
    return api.get<Reserva>(`/reservas/${encodeURIComponent(id)}`, { signal })
  },
  cancelar(id: string, signal?: AbortSignal): Promise<Reserva> {
    return api.patch<Reserva>(`/reservas/${encodeURIComponent(id)}`, { estado: 'CANCELADA' }, { signal })
  },

  delPasajero(pasajeroId: string, estado?: EstadoReserva, signal?: AbortSignal): Promise<Reserva[]> {
    return api.get<Reserva[]>(`/pasajeros/${encodeURIComponent(pasajeroId)}/reservas`, {
      params: estado ? { estado } : undefined,
      signal,
    })
  },
}
