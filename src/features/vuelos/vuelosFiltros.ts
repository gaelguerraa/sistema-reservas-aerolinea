import type { FiltrosVuelos, VueloResumen } from './types'
import { fechaISO } from './vuelosFormato'

const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export function filtrarVuelos(vuelos: VueloResumen[], { q, desde, hasta }: FiltrosVuelos): VueloResumen[] {
  const texto = normalizar(q)
  return vuelos.filter((vuelo) => {
    const dia = fechaISO(vuelo.fecha)
    if (desde && dia < desde) return false
    if (hasta && dia > hasta) return false
    if (!texto) return true
    return [vuelo.id, vuelo.origen, vuelo.destino].some((campo) => normalizar(campo).includes(texto))
  })
}

export function ordenarVuelos(vuelos: VueloResumen[]): VueloResumen[] {
  return [...vuelos].sort((a, b) => `${fechaISO(a.fecha)} ${a.hora}`.localeCompare(`${fechaISO(b.fecha)} ${b.hora}`))
}