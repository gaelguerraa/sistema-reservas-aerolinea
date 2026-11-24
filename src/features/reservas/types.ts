export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA'

export interface Reserva {
  id: string
  vueloId: string
  asientoId: string
  pasajeroId: string
  estado: EstadoReserva
  fechaCreacion: string
}

export type CambioEstadoReserva = Extract<EstadoReserva, 'CONFIRMADA' | 'CANCELADA'>
