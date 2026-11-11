import { classLabel } from '../vuelos/mocks'
import { formatHora, isPasada } from '../vuelos/utils'
import type { EstadoReserva, ReservaConVuelo } from './types'

export const ESTADO_ETIQUETA: Record<EstadoReserva, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  COMPLETADA: 'Completada',
}

/** Activa = ocupa un asiento (misma regla que el dominio). */
export function esActiva(estado: EstadoReserva): boolean {
  return estado === 'PENDIENTE' || estado === 'CONFIRMADA'
}

/** Futura = el vuelo todavía no sale. Sin datos del vuelo no se puede asegurar. */
export function esFutura(item: ReservaConVuelo, now = new Date()): boolean {
  if (item.reserva.estado === 'COMPLETADA' || !item.vuelo) return false
  return !isPasada(item.vuelo.fecha, item.vuelo.hora, now)
}

/** Solo se cancelan reservaciones activas de vuelos que aún no salen. */
export function puedeCancelar(item: ReservaConVuelo, now = new Date()): boolean {
  return esActiva(item.reserva.estado) && esFutura(item, now)
}

export function motivoNoCancelable(item: ReservaConVuelo, now = new Date()): string | null {
  if (puedeCancelar(item, now)) return null
  if (item.reserva.estado === 'CANCELADA') return 'Esta reservación ya está cancelada.'
  if (item.reserva.estado === 'COMPLETADA') return 'Las reservaciones completadas no se pueden cancelar.'
  if (!item.vuelo) return 'No pudimos confirmar la fecha del vuelo, así que no se puede cancelar desde aquí.'
  return 'El vuelo ya salió, así que esta reservación ya no se puede cancelar.'
}

function momento(item: ReservaConVuelo): string {
  return item.vuelo ? `${item.vuelo.fecha.slice(0, 10)}T${formatHora(item.vuelo.hora)}` : ''
}

/** Próximas: de la más cercana a la más lejana. Pasadas: de la más reciente a la más antigua. */
export function separarReservas(items: ReservaConVuelo[], now = new Date()) {
  const proximas = items.filter((item) => esFutura(item, now)).sort((a, b) => momento(a).localeCompare(momento(b)))
  const pasadas = items.filter((item) => !esFutura(item, now)).sort((a, b) => momento(b).localeCompare(momento(a)))
  return { proximas, pasadas }
}

export function etiquetaAsiento(item: ReservaConVuelo): string {
  return item.asiento ? `${item.asiento.numero} · ${classLabel(item.asiento.clase)}` : item.reserva.asientoId
}

export function formatFechaCreacion(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' }).format(date)
}
