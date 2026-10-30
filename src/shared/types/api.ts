/** Contrato del servicio del Avance 2, descrito UNA sola vez. */

// ---- Envoltura uniforme ----
export interface RespuestaOk<T> {
  ok: true
  data: T
}

export interface DetalleValidacion {
  donde: 'body' | 'params' | 'query'
  campo: string
  mensaje: string
}

export interface RespuestaError {
  ok: false
  error: { codigo: string; mensaje: string; detalles?: DetalleValidacion[] | unknown }
}

// ---- Enumeraciones ----
export type Rol = 'ADMIN' | 'CLIENTE'
export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA'
export type ClaseAsiento = 'ECONOMICA' | 'EJECUTIVA'

// ---- Auth ----
export interface Usuario {
  id: string
  email: string
  rol: Rol
  pasajeroId: string | null
}

export interface LoginBody {
  email: string
  password: string
}

export interface RegistroBody {
  nombre: string
  email: string
  password: string
}

export interface LoginRespuesta {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  usuario: Usuario
}

// ---- Vuelos ----
export interface Asiento {
  id: string
  vueloId: string
  numero: string
  clase: ClaseAsiento
  ocupado: boolean
}

export interface Vuelo {
  id: string
  origen: string
  destino: string
  fecha: string
  hora: string
}

export interface VueloDetalle extends Vuelo {
  asientos?: Omit<Asiento, 'ocupado'>[]
  capacidadTotal: number
}

export interface Disponibilidad {
  vueloId: string
  asientosDisponibles: number
}

// ---- Pasajeros y reservas ----
export interface Pasajero {
  id: string
  nombre: string
  contacto: string
}

export interface Reserva {
  id: string
  vueloId: string
  asientoId: string
  pasajeroId: string
  estado: EstadoReserva
  fechaCreacion: string
}

export interface CrearReservaBody {
  pasajeroId: string
  vueloId: string
  asientoId: string
}