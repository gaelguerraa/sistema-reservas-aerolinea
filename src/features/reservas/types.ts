import type { ClaseAsiento, Reserva, VueloDetalle } from '../../shared/types/api'

/** Los modelos del servicio viven en shared/types/api.ts; aquí solo se reexportan. */
export type { CrearReservaBody, EstadoReserva, Pasajero, Reserva } from '../../shared/types/api'

export interface AsientoResumen {
  id: string
  numero: string
  clase: ClaseAsiento
}

/**
 * La reservación del servicio solo trae IDs (vueloId, asientoId).
 * Para mostrarla al cliente le juntamos los datos del vuelo y del asiento.
 * `vuelo` y `asiento` son null si el servicio ya no los encuentra.
 */
export interface ReservaConVuelo {
  reserva: Reserva
  vuelo: VueloDetalle | null
  asiento: AsientoResumen | null
}
