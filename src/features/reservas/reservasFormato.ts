import type { EstadoReserva } from './types'

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

export function formatearFecha(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return fecha.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
