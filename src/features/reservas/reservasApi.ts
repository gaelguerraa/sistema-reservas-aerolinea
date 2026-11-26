import { api } from '../../shared/http/client'
import type {
  CambioEstadoReserva,
  CrearReservaBody,
  FiltrosReservas,
  Reserva,
  ReservaAgenda,
} from './types'

const ruta = (id: string) => `/reservas/${encodeURIComponent(id)}`

export const reservasApi = {
  listar: (filtros: FiltrosReservas, signal?: AbortSignal) => {
    const query = new URLSearchParams()
    if (filtros.desde) query.set('desde', filtros.desde)
    if (filtros.hasta) query.set('hasta', filtros.hasta)
    if (filtros.vueloId) query.set('vueloId', filtros.vueloId)
    if (filtros.estado) query.set('estado', filtros.estado)
    if (filtros.pasajeroId) query.set('pasajeroId', filtros.pasajeroId)
    const texto = query.toString()
    return api.get<ReservaAgenda[]>(`/reservas${texto ? `?${texto}` : ''}`, { signal })
  },
  obtener: (id: string, signal?: AbortSignal) => api.get<Reserva>(ruta(id), { signal }),
  crear: (body: CrearReservaBody) => api.post<Reserva>('/reservas', body),
  cambiarEstado: (id: string, estado: CambioEstadoReserva) =>
    api.patch<Reserva>(ruta(id), { estado }),
}
