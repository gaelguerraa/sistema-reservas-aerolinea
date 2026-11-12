import type { CrearReservaBody, EstadoReserva, Reserva, Usuario } from '../../shared/types/api'
import { getMockAsientos, getMockVuelo, getMockVuelos } from '../vuelos/mocks'

export const DEMO_EMAIL = 'cliente@ejemplo.com'
export const DEMO_PASSWORD = 'Cliente123'
const KEY = 'aerolinea.demo.v1'

interface DemoUser extends Usuario {
  nombre: string
  password: string
}

interface DemoState {
  users: DemoUser[]
  reservas: Reserva[]
  tokens: Record<string, { userId: string; expiresAt: number }>
  expiredSimulationUsed?: boolean
}

let memory: DemoState | null = null

function initialState(): DemoState {
  const users: DemoUser[] = [
    { id: 'demo-user', email: DEMO_EMAIL, password: DEMO_PASSWORD, nombre: 'Cliente de demostración', rol: 'CLIENTE', pasajeroId: 'demo-pasajero' },
    { id: 'demo-user-vacio', email: 'sinreservas@ejemplo.com', password: DEMO_PASSWORD, nombre: 'Cliente sin reservas', rol: 'CLIENTE', pasajeroId: 'demo-pasajero-vacio' },
  ]
  const ejemplos: Array<[string, string, EstadoReserva]> = [
    ['V100', '1B', 'CONFIRMADA'], ['V200', '12F', 'PENDIENTE'],
    ['V400', '1C', 'CANCELADA'], ['V700', '12A', 'COMPLETADA'],
  ]
  return {
    users, tokens: {},
    reservas: ejemplos.map(([vueloId, numero, estado], index) => ({
      id: `res-demo-${index + 1}`, vueloId, asientoId: `${vueloId}-${numero}`,
      pasajeroId: 'demo-pasajero', estado, fechaCreacion: new Date().toISOString(),
    })),
  }
}

function read(): DemoState {
  try {
    const saved = window.sessionStorage.getItem(KEY)
    if (saved) {
      const state = JSON.parse(saved) as DemoState
      if (Array.isArray(state.users) && Array.isArray(state.reservas) && state.tokens) return state
    }
  } catch {
    return memory ?? initialState()
  }
  return memory ?? initialState()
}

function save(state: DemoState): void {
  memory = state
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    return
  }
}

export function resetDemo(): void {
  save(initialState())
}

function ok(data: unknown, status = 200) {
  return { status, body: { ok: true, data } }
}

function fail(status: number, codigo: string, mensaje: string, detalles?: unknown) {
  return { status, body: { ok: false, error: { codigo, mensaje, detalles } } }
}

function publicUser(user: DemoUser): Usuario {
  return { id: user.id, email: user.email, rol: user.rol, pasajeroId: user.pasajeroId }
}

function seats(state: DemoState, vueloId: string) {
  return getMockAsientos(vueloId)?.map((seat) => {
    const related = state.reservas.filter((reserva) => reserva.asientoId === seat.id)
    return { ...seat, ocupado: related.length ? related.some((reserva) => reserva.estado === 'PENDIENTE' || reserva.estado === 'CONFIRMADA') : seat.ocupado }
  })
}

export function demoRequest(method: string, url: URL, body: unknown, authorization: string) {
  const state = read()
  const data = (body ?? {}) as Record<string, unknown>
  const path = url.pathname
  const action = method.toUpperCase()
  const params = new URLSearchParams(window.location.search)
  if (params.get('mockError') === '1') return fail(503, 'ERROR_INTERNO', 'Servicio no disponible')

  if (path === '/auth/login' && action === 'POST') {
    const user = state.users.find((item) => item.email === String(data.email).trim().toLowerCase() && item.password === data.password)
    if (!user) return fail(401, 'NO_AUTENTICADO', 'Correo o contraseña incorrectos.')
    const accessToken = `demo-${crypto.randomUUID()}`
    state.tokens[accessToken] = { userId: user.id, expiresAt: Date.now() + 3600000 }
    save(state)
    return ok({ accessToken, tokenType: 'Bearer', expiresIn: 3600, usuario: publicUser(user) })
  }

  if (action === 'GET' && path === '/vuelos') return ok(params.get('mockEmpty') === '1' ? [] : getMockVuelos())
  const flightMatch = path.match(/^\/vuelos\/([^/]+)(?:\/(asientos|disponibilidad))?$/)
  if (action === 'GET' && flightMatch) {
    const id = decodeURIComponent(flightMatch[1])
    const flight = getMockVuelo(id)
    if (!flight) return fail(404, 'NO_ENCONTRADO', 'Vuelo no encontrado.')
    const items = seats(state, id) ?? []
    if (flightMatch[2] === 'asientos') return ok(items)
    if (flightMatch[2] === 'disponibilidad') return ok({ vueloId: id, asientosDisponibles: items.filter((item) => !item.ocupado).length })
    return ok(flight)
  }

  const token = authorization.replace(/^Bearer /, '')
  const session = state.tokens[token]
  const user = state.users.find((item) => item.id === session?.userId)
  if (session && params.get('mockExpired') === '1' && !state.expiredSimulationUsed) {
    session.expiresAt = 0
    state.expiredSimulationUsed = true
    save(state)
  }
  if (!session || session.expiresAt <= Date.now() || !user) {
    return fail(401, 'NO_AUTENTICADO', 'Tu sesión ha vencido.')
  }
  if (action === 'GET' && path === '/auth/me') return ok(publicUser(user))

  const passengerMatch = path.match(/^\/pasajeros\/([^/]+)(?:\/(reservas))?$/)
  if (action === 'GET' && passengerMatch) {
    const pasajeroId = decodeURIComponent(passengerMatch[1])
    if (pasajeroId !== user.pasajeroId) return fail(403, 'SIN_PERMISO', 'No puedes consultar esta información.')
    if (!passengerMatch[2]) return ok({ id: pasajeroId, nombre: user.nombre, contacto: user.email })
    const estado = url.searchParams.get('estado')
    return ok(params.get('mockEmpty') === '1' ? [] : state.reservas.filter((reserva) => reserva.pasajeroId === pasajeroId && (!estado || reserva.estado === estado)))
  }

  if (action === 'POST' && path === '/reservas') {
    const input = data as unknown as CrearReservaBody
    if (input.pasajeroId !== user.pasajeroId) return fail(403, 'SIN_PERMISO', 'No puedes reservar para otra cuenta.')
    const flight = getMockVuelo(input.vueloId)
    if (!flight) return fail(404, 'NO_ENCONTRADO', 'Vuelo no encontrado.')
    const departure = new Date(`${flight.fecha.slice(0, 10)}T${flight.hora}`)
    if (departure.getTime() <= Date.now()) return fail(409, 'REGLA_DE_NEGOCIO', 'Este vuelo ya salió.')
    const items = seats(state, input.vueloId) ?? []
    const seat = items.find((item) => item.id === input.asientoId)
    if (!seat) return fail(400, 'VALIDACION_FALLIDA', 'Elige un asiento.', [{ campo: 'asientoId', mensaje: 'Elige un asiento de este vuelo.' }])
    if (seat.ocupado) return fail(409, 'ASIENTO_OCUPADO', 'Ese asiento está ocupado.')
    const reserva: Reserva = { ...input, id: `res-${crypto.randomUUID()}`, estado: 'PENDIENTE', fechaCreacion: new Date().toISOString() }
    state.reservas.push(reserva)
    save(state)
    return ok(reserva, 201)
  }

  const reservationMatch = path.match(/^\/reservas\/([^/]+)$/)
  if (reservationMatch) {
    const reserva = state.reservas.find((item) => item.id === decodeURIComponent(reservationMatch[1]))
    if (!reserva) return fail(404, 'NO_ENCONTRADO', 'Reservación no encontrada.')
    if (reserva.pasajeroId !== user.pasajeroId) return fail(403, 'SIN_PERMISO', 'No puedes consultar esta reservación.')
    if (action === 'GET') return ok(reserva)
    if (action === 'PATCH') {
      if (reserva.estado === 'COMPLETADA') return fail(409, 'RESERVA_COMPLETADA', 'Este viaje ya terminó.')
      if (reserva.estado === 'CANCELADA' || data.estado !== 'CANCELADA') return fail(409, 'TRANSICION_INVALIDA', 'No puedes realizar ese cambio.')
      reserva.estado = 'CANCELADA'
      save(state)
      return ok(reserva)
    }
  }
  return fail(404, 'RUTA_NO_ENCONTRADA', 'No encontramos lo que buscas.')
}
