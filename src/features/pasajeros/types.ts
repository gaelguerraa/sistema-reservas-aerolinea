export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA'

export interface Pasajero {
  id: string
  nombre: string
  contacto: string
}

export interface ReservaPasajero {
  id: string
  vueloId: string
  asientoId: string
  pasajeroId: string
  estado: EstadoReserva
  fechaCreacion: string
}

export interface CrearPasajeroBody {
  nombre: string
  contacto: string
}

export type EditarPasajeroBody = Partial<CrearPasajeroBody>

export interface FiltrosPasajeros {
  q: string
}
