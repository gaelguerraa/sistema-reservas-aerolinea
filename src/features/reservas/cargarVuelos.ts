import { getApiErrorStatus, vuelosApi } from '../vuelos/vuelosApi'
import type { VueloDetalle } from '../vuelos/types'
import type { AsientoResumen, Reserva, ReservaConVuelo } from './types'

interface InfoVuelo {
  vuelo: VueloDetalle
  asientos: AsientoResumen[]
}

/** Un vuelo que ya no existe (404) no rompe la lista: se muestra con menos datos. */
async function cargarVuelo(id: string, signal?: AbortSignal): Promise<InfoVuelo | null> {
  try {
    const vuelo = await vuelosApi.get(id, signal)
    const asientos = vuelo.asientos ?? await vuelosApi.seats(id, signal)
    return { vuelo, asientos }
  } catch (error) {
    if (getApiErrorStatus(error) === 404) return null
    throw error
  }
}

/** Junta cada reservación con su vuelo y asiento. Pide cada vuelo una sola vez. */
export async function conVuelos(reservas: Reserva[], signal?: AbortSignal): Promise<ReservaConVuelo[]> {
  const ids = [...new Set(reservas.map((reserva) => reserva.vueloId))]
  const infos = await Promise.all(ids.map((id) => cargarVuelo(id, signal)))
  const porVuelo = new Map(ids.map((id, index) => [id, infos[index]]))

  return reservas.map((reserva) => {
    const info = porVuelo.get(reserva.vueloId) ?? null
    const asiento = info?.asientos.find((item) => item.id === reserva.asientoId)
    return {
      reserva,
      vuelo: info?.vuelo ?? null,
      asiento: asiento ? { id: asiento.id, numero: asiento.numero, clase: asiento.clase } : null,
    }
  })
}
