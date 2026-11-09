import type { Asiento } from './types'

export function toYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatFechaLarga(value: string): string {
  const day = value.slice(0, 10)
  const [year, month, date] = day.split('-').map(Number)
  if (!year || !month || !date) return day || 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, date)))
}

export function formatHora(value: string): string {
  return /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : value
}

export function isPasada(fecha: string, hora: string, now = new Date()): boolean {
  const date = fecha.slice(0, 10)
  const today = toYmd(now)
  return date < today || (date === today && formatHora(hora) < `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
}

export function parseNumeroAsiento(value: string): { fila: string; columna: string } {
  const normalized = value.trim().toUpperCase()
  const match = normalized.match(/^(\d+)([A-Z]*)$/)
  return match ? { fila: match[1], columna: match[2] || '?' } : { fila: normalized || '?', columna: '?' }
}

export function buildReservarUrl(vueloId: string, asientoId: string): string {
  const query = new URLSearchParams({ vueloId, asientoId })
  return `/reservar?${query.toString()}`
}

export function ordenarVuelos<T extends VueloLike>(vuelos: T[]): T[] {
  return [...vuelos].sort((a, b) => `${a.fecha.slice(0, 10)}T${a.hora}`.localeCompare(`${b.fecha.slice(0, 10)}T${b.hora}`))
}

type VueloLike = { fecha: string; hora: string }

export function agruparAsientos(asientos: Asiento[]): Array<{ clase: Asiento['clase']; filas: Array<{ fila: string; asientos: Asiento[] }> }> {
  return (['EJECUTIVA', 'ECONOMICA'] as const).map((clase) => {
    const seats = asientos.filter((asiento) => asiento.clase === clase)
    const filas = new Map<string, Asiento[]>()
    seats.forEach((seat) => {
      const fila = parseNumeroAsiento(seat.numero).fila
      filas.set(fila, [...(filas.get(fila) ?? []), seat])
    })
    return { clase, filas: [...filas.entries()].sort(([a], [b]) => Number(a) - Number(b)).map(([fila, rowSeats]) => ({ fila, asientos: rowSeats })) }
  }).filter((group) => group.filas.length)
}
