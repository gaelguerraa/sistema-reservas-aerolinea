
export type ClaseAsiento = 'ECONOMICA' | 'EJECUTIVA'

export interface VueloResumen {
  id: string
  origen: string
  destino: string
  fecha: string
  hora: string
  capacidadTotal: number
}

export interface Asiento {
  id: string
  vueloId: string
  numero: string
  clase: ClaseAsiento
}

export interface Vuelo extends VueloResumen {
  asientos: Asiento[]
}

export interface AsientoConEstado extends Asiento {
  ocupado: boolean
}

export interface Disponibilidad {
  vueloId: string
  asientosDisponibles: number
}

export interface AsientoBody {
  numero: string
  clase: ClaseAsiento
}

export interface CrearVueloBody {
  id: string
  origen: string
  destino: string
  fecha: string
  hora: string
  asientos: AsientoBody[]
}

export type EditarVueloBody = Pick<CrearVueloBody, 'origen' | 'destino' | 'fecha' | 'hora'>

export interface FiltrosVuelos {
  q: string
  desde: string
  hasta: string
}
