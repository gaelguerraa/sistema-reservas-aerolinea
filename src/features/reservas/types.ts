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

export interface FiltrosReservas {
  desde: string
  hasta: string
  vueloId: string
  estado: '' | EstadoReserva
  pasajeroId: string
}

export interface ReservaAgenda {
  id: string
  estado: EstadoReserva
  fechaCreacion: string
  vuelo: {
    id: string
    origen: string
    destino: string
    fecha: string
    hora: string
  }
  asiento: {
    id: string
    numero: string
    clase: string
  }
  pasajero: {
    id: string
    nombre: string
  }
}

export interface CrearReservaBody {
  pasajeroId: string
  vueloId: string
  asientoId: string
}
