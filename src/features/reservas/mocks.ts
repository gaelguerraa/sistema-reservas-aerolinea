import { ApiError } from '../../shared/http/client'
import { getMockAsientos, getMockVuelo } from '../vuelos/mocks'
import type { CrearReservaBody, EstadoReserva, Pasajero, Reserva } from './types'

/**
 * Datos de demostración para VITE_USE_MOCKS=true.
 * Imitan las reglas y los códigos de error del servicio del avance 2.
 * Se guardan en sessionStorage para que sobrevivan a una recarga.
 * Parámetros de URL: ?mockError=1 (falla el servicio) y ?mockEmpty=1 (lista vacía).
 */

interface EstadoMock {
  reservas: Reserva[]
  sembrados: string[]
  contador: number
}

const KEY = 'aerolinea.mock.reservas'
let enMemoria: EstadoMock = { reservas: [], sembrados: [], contador: 0 }

function leer(): EstadoMock {
  try {
    const valor = JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null') as EstadoMock | null
    if (valor && Array.isArray(valor.reservas) && Array.isArray(valor.sembrados)) return valor
  } catch {
    /* sin almacenamiento: se usa la copia en memoria */
  }
  return enMemoria
}

function guardar(estado: EstadoMock): void {
  enMemoria = estado
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(estado))
  } catch {
    /* queda en memoria hasta recargar */
  }
}

function diasAtras(dias: number): string {
  const date = new Date()
  date.setDate(date.getDate() - dias)
  return date.toISOString()
}

/** Una reservación en cada estado, sobre vuelos de los datos falsos de la Persona 3. */
const DEMO: Array<[vueloId: string, numero: string, estado: EstadoReserva, creadaHaceDias: number]> = [
  ['V100', '1B', 'CONFIRMADA', 6],
  ['V200', '12F', 'PENDIENTE', 1],
  ['V400', '1C', 'CANCELADA', 9],
  ['V700', '12A', 'COMPLETADA', 20],
]

function sembrar(estado: EstadoMock, pasajeroId: string): EstadoMock {
  if (estado.sembrados.includes(pasajeroId)) return estado
  const grupo = estado.sembrados.length + 1
  const nuevas = DEMO.map(([vueloId, numero, estadoReserva, dias], index): Reserva => ({
    id: `res-demo-${grupo}-${index + 1}`,
    vueloId,
    asientoId: `${vueloId}-${numero}`,
    pasajeroId,
    estado: estadoReserva,
    fechaCreacion: diasAtras(dias),
  }))
  return { ...estado, reservas: [...estado.reservas, ...nuevas], sembrados: [...estado.sembrados, pasajeroId] }
}

function parametro(nombre: string): boolean {
  return new URLSearchParams(window.location.search).get(nombre) === '1'
}

function esperar(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, 600 + Math.random() * 600)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(new DOMException('Solicitud cancelada', 'AbortError'))
    }, { once: true })
  })
}

async function simular<T>(signal: AbortSignal | undefined, operacion: () => T): Promise<T> {
  await esperar(signal)
  if (parametro('mockError')) {
    throw new ApiError({ kind: 'SERVIDOR', status: 503, code: 'SERVICIO_NO_DISPONIBLE', message: 'Servicio no disponible' })
  }
  return operacion()
}

function noEncontrado(tipo: string, id: string): ApiError {
  return new ApiError({ kind: 'NO_ENCONTRADO', status: 404, code: 'NO_ENCONTRADO', message: `${tipo} con id ${id} no fue encontrado.` })
}

function conflicto(code: string, message: string): ApiError {
  return new ApiError({ kind: 'CONFLICTO', status: 409, code, message })
}

const activa = (reserva: Reserva) => reserva.estado === 'PENDIENTE' || reserva.estado === 'CONFIRMADA'

export const reservasMock = {
  crear(body: CrearReservaBody, signal?: AbortSignal): Promise<Reserva> {
    return simular(signal, () => {
      const estado = leer()
      if (!getMockVuelo(body.vueloId)) throw noEncontrado('Vuelo', body.vueloId)
      const asientos = getMockAsientos(body.vueloId) ?? []
      if (!asientos.some((asiento) => asiento.id === body.asientoId)) throw noEncontrado('Asiento', body.asientoId)

      const ocupados = new Set([
        ...asientos.filter((asiento) => asiento.ocupado).map((asiento) => asiento.id),
        ...estado.reservas.filter((r) => r.vueloId === body.vueloId && activa(r)).map((r) => r.asientoId),
      ])
      if (ocupados.size >= asientos.length) {
        throw conflicto('VUELO_SIN_DISPONIBILIDAD', `El vuelo ${body.vueloId} no tiene asientos disponibles en este momento.`)
      }
      if (ocupados.has(body.asientoId)) {
        throw conflicto('ASIENTO_OCUPADO', `El asiento ${body.asientoId} ya está ocupado por otra reserva activa.`)
      }

      const contador = estado.contador + 1
      const reserva: Reserva = {
        id: `res-mock-${contador}`,
        vueloId: body.vueloId,
        asientoId: body.asientoId,
        pasajeroId: body.pasajeroId,
        estado: 'PENDIENTE',
        fechaCreacion: new Date().toISOString(),
      }
      guardar({ ...estado, contador, reservas: [...estado.reservas, reserva] })
      return { ...reserva }
    })
  },

  obtener(id: string, signal?: AbortSignal): Promise<Reserva> {
    return simular(signal, () => {
      const reserva = leer().reservas.find((r) => r.id === id)
      if (!reserva) throw noEncontrado('Reserva', id)
      return { ...reserva }
    })
  },

  cancelar(id: string, signal?: AbortSignal): Promise<Reserva> {
    return simular(signal, () => {
      const estado = leer()
      const reserva = estado.reservas.find((r) => r.id === id)
      if (!reserva) throw noEncontrado('Reserva', id)
      if (reserva.estado === 'COMPLETADA') throw conflicto('RESERVA_COMPLETADA', `La reserva ${id} ya está completada y no se puede cancelar.`)
      if (reserva.estado === 'CANCELADA') throw conflicto('TRANSICION_INVALIDA', `La reserva ${id} ya está cancelada.`)

      const cancelada: Reserva = { ...reserva, estado: 'CANCELADA' }
      guardar({ ...estado, reservas: estado.reservas.map((r) => (r.id === id ? cancelada : r)) })
      return { ...cancelada }
    })
  },

  delPasajero(pasajeroId: string, estadoReserva?: EstadoReserva, signal?: AbortSignal): Promise<Reserva[]> {
    return simular(signal, () => {
      if (parametro('mockEmpty')) return []
      const estado = sembrar(leer(), pasajeroId)
      guardar(estado)
      return estado.reservas
        .filter((r) => r.pasajeroId === pasajeroId && (!estadoReserva || r.estado === estadoReserva))
        .map((r) => ({ ...r }))
    })
  },
}

export const pasajerosMock = {
  obtener(id: string, signal?: AbortSignal): Promise<Pasajero> {
    return simular(signal, () => ({ id, nombre: 'Cliente de demostración', contacto: 'cliente@ejemplo.com' }))
  },
}
