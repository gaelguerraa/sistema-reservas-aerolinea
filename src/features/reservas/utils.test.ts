import { describe, expect, it } from 'vitest'
import type { ReservaConVuelo } from './types'
import { motivoNoCancelable, puedeCancelar, separarReservas } from './utils'

const ahora = new Date(2026, 10, 9, 12, 0)

function item(id: string, estado: ReservaConVuelo['reserva']['estado'], fecha: string | null, hora = '10:00'): ReservaConVuelo {
  return {
    reserva: { id, vueloId: 'V1', asientoId: 'A1', pasajeroId: 'P1', estado, fechaCreacion: '2026-11-01T00:00:00.000Z' },
    vuelo: fecha ? { id: 'V1', origen: 'A', destino: 'B', fecha, hora, capacidadTotal: 1 } : null,
    asiento: null,
  }
}

describe('reglas de cancelación', () => {
  it('solo cancela reservaciones activas de vuelos que no han salido', () => {
    expect(puedeCancelar(item('a', 'PENDIENTE', '2026-11-20'), ahora)).toBe(true)
    expect(puedeCancelar(item('b', 'CONFIRMADA', '2026-11-20'), ahora)).toBe(true)
    expect(puedeCancelar(item('c', 'CANCELADA', '2026-11-20'), ahora)).toBe(false)
    expect(puedeCancelar(item('d', 'COMPLETADA', '2026-11-01'), ahora)).toBe(false)
    expect(puedeCancelar(item('e', 'CONFIRMADA', '2026-11-01'), ahora)).toBe(false)
    // Mismo día: depende de la hora de salida.
    expect(puedeCancelar(item('f', 'CONFIRMADA', '2026-11-09', '11:00'), ahora)).toBe(false)
    expect(puedeCancelar(item('g', 'CONFIRMADA', '2026-11-09', '18:00'), ahora)).toBe(true)
    expect(puedeCancelar(item('h', 'CONFIRMADA', null), ahora)).toBe(false)
  })

  it('explica el motivo cuando no se puede cancelar', () => {
    expect(motivoNoCancelable(item('a', 'PENDIENTE', '2026-11-20'), ahora)).toBeNull()
    expect(motivoNoCancelable(item('c', 'CANCELADA', '2026-11-20'), ahora)).toMatch(/ya está cancelada/)
    expect(motivoNoCancelable(item('e', 'CONFIRMADA', '2026-11-01'), ahora)).toMatch(/ya salió/)
  })

  it('separa próximas (más cercana primero) y pasadas (más reciente primero)', () => {
    const { proximas, pasadas } = separarReservas([
      item('lejana', 'PENDIENTE', '2026-12-24'),
      item('vieja', 'COMPLETADA', '2026-01-05'),
      item('cercana', 'CONFIRMADA', '2026-11-12'),
      item('reciente', 'CONFIRMADA', '2026-11-02'),
    ], ahora)
    expect(proximas.map((i) => i.reserva.id)).toEqual(['cercana', 'lejana'])
    expect(pasadas.map((i) => i.reserva.id)).toEqual(['reciente', 'vieja'])
  })
})
