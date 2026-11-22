import { api } from '../../shared/http/client'
import type {
  CrearPasajeroBody,
  EditarPasajeroBody,
  EstadoReserva,
  Pasajero,
  ReservaPasajero,
} from './types'

const ruta = (id: string) => `/pasajeros/${encodeURIComponent(id)}`

export const pasajerosApi = {
  listar: (signal?: AbortSignal) => api.get<Pasajero[]>('/pasajeros', { signal }),
  obtener: (id: string, signal?: AbortSignal) => api.get<Pasajero>(ruta(id), { signal }),
  reservas: (id: string, estado?: EstadoReserva, signal?: AbortSignal) => {
    const query = estado ? `?estado=${encodeURIComponent(estado)}` : ''
    return api.get<ReservaPasajero[]>(`${ruta(id)}/reservas${query}`, { signal })
  },
  crear: (body: CrearPasajeroBody) => api.post<Pasajero>('/pasajeros', body),
  actualizar: (id: string, body: EditarPasajeroBody) => api.patch<Pasajero>(ruta(id), body),
  darDeBaja: (id: string) => api.delete<{ id: string }>(ruta(id)),
}
