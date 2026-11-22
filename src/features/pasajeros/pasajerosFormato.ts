import type { EstadoReserva, FiltrosPasajeros, Pasajero } from './types'

export function formatearFecha(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function etiquetaEstadoReserva(estado: EstadoReserva): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'Pendiente'
    case 'CONFIRMADA':
      return 'Confirmada'
    case 'CANCELADA':
      return 'Cancelada'
    case 'COMPLETADA':
      return 'Completada'
  }
}

export function filtrarPasajeros(pasajeros: Pasajero[], filtros: FiltrosPasajeros): Pasajero[] {
  const termino = filtros.q.trim().toLowerCase()
  if (!termino) return pasajeros
  return pasajeros.filter(
    (p) =>
      p.nombre.toLowerCase().includes(termino) ||
      p.contacto.toLowerCase().includes(termino) ||
      p.id.toLowerCase().includes(termino)
  )
}

export function ordenarPasajeros(pasajeros: Pasajero[]): Pasajero[] {
  return [...pasajeros].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function avisoDesdeEstado(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('notice' in state)) return null
  const notice = (state as { notice?: unknown }).notice
  return typeof notice === 'string' && notice ? notice : null
}

export function filtrosDesdeEstado(state: unknown): string {
  if (!state || typeof state !== 'object' || !('from' in state)) return ''
  const from = (state as { from?: unknown }).from
  return typeof from === 'string' && from.startsWith('?') ? from : ''
}
