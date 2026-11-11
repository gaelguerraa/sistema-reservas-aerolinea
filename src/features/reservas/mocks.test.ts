import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reservasMock } from './mocks'

/** Avanza el reloj falso para que la latencia simulada termine. */
async function resolver<T>(promesa: Promise<T>): Promise<T> {
  const resultado = promesa.then((valor) => ({ ok: true as const, valor }), (error: unknown) => ({ ok: false as const, error }))
  await vi.runAllTimersAsync()
  const final = await resultado
  if (final.ok === true) return final.valor
  throw final.error
}

describe('datos de demostración de reservaciones', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.sessionStorage.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('siembra una reservación en cada estado para el pasajero', async () => {
    const reservas = await resolver(reservasMock.delPasajero('P-test'))
    expect(reservas.map((r) => r.estado).sort()).toEqual(['CANCELADA', 'COMPLETADA', 'CONFIRMADA', 'PENDIENTE'])
  })

  it('rechaza con 409 un asiento que ya tiene una reservación activa', async () => {
    const creada = await resolver(reservasMock.crear({ pasajeroId: 'P1', vueloId: 'V100', asientoId: 'V100-1A' }))
    expect(creada.estado).toBe('PENDIENTE')
    await expect(resolver(reservasMock.crear({ pasajeroId: 'P2', vueloId: 'V100', asientoId: 'V100-1A' })))
      .rejects.toMatchObject({ status: 409, code: 'ASIENTO_OCUPADO' })
  })

  it('cancela una activa y rechaza cancelar una completada', async () => {
    const reservas = await resolver(reservasMock.delPasajero('P1'))
    const activa = reservas.find((r) => r.estado === 'CONFIRMADA')!
    const completada = reservas.find((r) => r.estado === 'COMPLETADA')!
    expect((await resolver(reservasMock.cancelar(activa.id))).estado).toBe('CANCELADA')
    await expect(resolver(reservasMock.cancelar(completada.id))).rejects.toMatchObject({ status: 409, code: 'RESERVA_COMPLETADA' })
    await expect(resolver(reservasMock.cancelar(activa.id))).rejects.toMatchObject({ status: 409, code: 'TRANSICION_INVALIDA' })
  })
})
