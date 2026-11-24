import { api } from '../../shared/http/client'
import type { CambioEstadoReserva, Reserva } from './types'

const ruta = (id: string) => `/reservas/${encodeURIComponent(id)}`

export const reservasApi = {
  obtener: (id: string, signal?: AbortSignal) => api.get<Reserva>(ruta(id), { signal }),
  cambiarEstado: (id: string, estado: CambioEstadoReserva) =>
    api.patch<Reserva>(ruta(id), { estado }),
}
