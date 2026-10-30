/** Modelos del contrato del servicio, declarados una sola vez en la feature. */
export type ClaseAsiento = 'ECONOMICA' | 'EJECUTIVA'

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
