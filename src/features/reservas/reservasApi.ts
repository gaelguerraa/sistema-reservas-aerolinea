import { api } from '../../shared/http/client'
import type { CrearReservaBody, EstadoReserva, Reserva } from '../../shared/types/api'
import { reservasMock } from './mocks'

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

export const reservasApi = {
  crear(body: CrearReservaBody, signal?: AbortSignal): Promise<Reserva> {
    if (useMocks) return reservasMock.crear(body, signal)
    return api.post<Reserva>('/reservas', body, { signal })
  },
  obtener(id: string, signal?: AbortSignal): Promise<Reserva> {
    if (useMocks) return reservasMock.obtener(id, signal)
    return api.get<Reserva>(`/reservas/${encodeURIComponent(id)}`, { signal })
  },
  cancelar(id: string, signal?: AbortSignal): Promise<Reserva> {
    if (useMocks) return reservasMock.cancelar(id, signal)
    return api.patch<Reserva>(`/reservas/${encodeURIComponent(id)}`, { estado: 'CANCELADA' }, { signal })
  },
  /** Historial del pasajero (requiere sesión; el servicio valida que sea el propio). */
  delPasajero(pasajeroId: string, estado?: EstadoReserva, signal?: AbortSignal): Promise<Reserva[]> {
    if (useMocks) return reservasMock.delPasajero(pasajeroId, estado, signal)
    return api.get<Reserva[]>(`/pasajeros/${encodeURIComponent(pasajeroId)}/reservas`, {
      params: estado ? { estado } : undefined,
      signal,
    })
  },
}
