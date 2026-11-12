import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_EMAIL, DEMO_PASSWORD, demoRequest, resetDemo } from './seed'

function call(method: string, path: string, body: unknown = undefined, token = '') {
  const result = demoRequest(method, new URL(path, 'http://demo.local'), body, token ? `Bearer ${token}` : '')
  return result as { status: number; body: { ok: boolean; data: unknown; error: { codigo: string } } }
}

function login(email = DEMO_EMAIL) {
  const response = call('POST', '/auth/login', { email, password: DEMO_PASSWORD })
  return (response.body.data as { accessToken: string }).accessToken
}

describe('demostración completa', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    window.sessionStorage.clear()
    resetDemo()
  })

  it('permite iniciar sesión y protege los datos de otros clientes', () => {
    expect(call('GET', '/pasajeros/demo-pasajero/reservas').status).toBe(401)
    expect(call('POST', '/auth/login', { email: DEMO_EMAIL, password: 'incorrecta' }).status).toBe(401)
    const token = login()
    expect(call('GET', '/pasajeros/demo-pasajero/reservas', undefined, token).body.data).toHaveLength(4)
    expect(call('GET', '/pasajeros/demo-pasajero-vacio/reservas', undefined, token).status).toBe(403)
    expect(call('GET', '/reservas/res-demo-1', undefined, login('sinreservas@ejemplo.com')).status).toBe(403)
  })

  it('refleja la reserva y la cancelación en la disponibilidad', () => {
    const token = login()
    const body = { pasajeroId: 'demo-pasajero', vueloId: 'V100', asientoId: 'V100-1A' }
    const created = call('POST', '/reservas', body, token)
    expect(created.status).toBe(201)
    const id = (created.body.data as { id: string }).id
    const occupied = call('GET', '/vuelos/V100/asientos').body.data as Array<{ id: string; ocupado: boolean }>
    expect(occupied.find((seat) => seat.id === body.asientoId)?.ocupado).toBe(true)
    expect(call('POST', '/reservas', body, token).body.error.codigo).toBe('ASIENTO_OCUPADO')
    expect(call('PATCH', `/reservas/${id}`, { estado: 'CANCELADA' }, token).status).toBe(200)
    const available = call('GET', '/vuelos/V100/asientos').body.data as Array<{ id: string; ocupado: boolean }>
    expect(available.find((seat) => seat.id === body.asientoId)?.ocupado).toBe(false)
    expect(call('PATCH', '/reservas/res-demo-4', { estado: 'CANCELADA' }, token).body.error.codigo).toBe('RESERVA_COMPLETADA')
  })

  it('permite probar lista vacía, servicio caído y sesión vencida sin bloquear el siguiente login', () => {
    const token = login()
    expect(call('GET', '/pasajeros/demo-pasajero-vacio/reservas', undefined, login('sinreservas@ejemplo.com')).body.data).toEqual([])
    window.history.replaceState({}, '', '/vuelos?mockEmpty=1')
    expect(call('GET', '/vuelos').body.data).toEqual([])
    window.history.replaceState({}, '', '/vuelos?mockError=1')
    expect(call('GET', '/vuelos').status).toBe(503)
    window.history.replaceState({}, '', '/reservas?mockExpired=1')
    expect(call('GET', '/pasajeros/demo-pasajero/reservas', undefined, token).status).toBe(401)
    expect(call('GET', '/pasajeros/demo-pasajero/reservas', undefined, login()).status).toBe(200)
  })
})
