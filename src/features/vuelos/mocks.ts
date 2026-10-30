import type { Asiento, ClaseAsiento, Vuelo, VueloDetalle } from './types'
import { toYmd } from './utils'

function dateAfter(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${toYmd(date)}T14:00:00.000Z`
}

const rutas = [
  ['V100', 'Hermosillo', 'Ciudad de México', 1, '07:20'],
  ['V200', 'Ciudad de México', 'Guadalajara', 2, '10:45'],
  ['V300', 'Monterrey', 'Cancún', 3, '12:10'],
  ['V400', 'Guadalajara', 'Los Ángeles', 5, '08:30'],
  ['V500', 'Ciudad de México', 'Madrid', 7, '18:50'],
  ['V600', 'Tijuana', 'Hermosillo', 9, '16:15'],
  ['V700', 'Oaxaca', 'Ciudad de México', -1, '09:00'],
] as const

const baseVuelos: VueloDetalle[] = rutas.map(([id, origen, destino, offset, hora]) => ({
  id, origen, destino, fecha: dateAfter(offset), hora, capacidadTotal: id === 'V600' ? 0 : 12,
}))

function seatsFor(vuelo: Vuelo): Asiento[] {
  if (vuelo.id === 'V600') return []
  const seats = (['EJECUTIVA', 'ECONOMICA'] as const).flatMap((clase, classIndex) => {
    const row = classIndex === 0 ? 1 : 12
    return ['A', 'B', 'C', 'D', 'E', 'F'].map((column, index) => {
      const numero = `${row}${column}`
      return { id: `${vuelo.id}-${numero}`, vueloId: vuelo.id, numero, clase, ocupado: vuelo.id === 'V300' || (vuelo.id === 'V100' && index === 1) || index === 5 }
    })
  })
  return seats
}

const mockAsientos: Record<string, Asiento[]> = Object.fromEntries(baseVuelos.map((vuelo) => [vuelo.id, seatsFor(vuelo)]))
const full = mockAsientos.V300
if (full) mockAsientos.V300 = full.map((seat) => ({ ...seat, ocupado: true }))

export function getMockVuelos(): Vuelo[] { return baseVuelos.map((flight) => ({ ...flight })) }
export function getMockVuelo(id: string): VueloDetalle | undefined {
  const flight = baseVuelos.find((item) => item.id === id)
  if (!flight) return undefined
  return { ...flight, asientos: mockAsientos[id]?.map(({ id: _id, vueloId, numero, clase }) => ({ id: _id, vueloId, numero, clase })) }
}
export function getMockAsientos(id: string): Asiento[] | undefined { return mockAsientos[id]?.map((seat) => ({ ...seat })) }

export function classLabel(clase: ClaseAsiento): string {
  return clase === 'EJECUTIVA' ? 'Ejecutiva' : 'Económica'
}
