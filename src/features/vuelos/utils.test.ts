import { describe, expect, it } from 'vitest'
import { buildReservarUrl, formatFechaLarga, formatHora, isPasada, parseNumeroAsiento, toYmd } from './utils'

describe('utilidades de vuelos', () => {
  it('formatea fechas ISO sin cambiar el día por la zona horaria', () => {
    expect(formatFechaLarga('2027-01-02T00:00:00.000Z')).toBe('2 de enero de 2027')
    expect(formatHora('09:35:00')).toBe('09:35')
    expect(toYmd(new Date(2027, 0, 2, 23))).toBe('2027-01-02')
  })

  it('marca vuelos pasados con fecha y hora locales', () => {
    expect(isPasada('2020-01-01T00:00:00.000Z', '12:00', new Date(2020, 0, 2))).toBe(true)
    expect(isPasada('2020-01-02', '08:00', new Date(2020, 0, 2, 9, 0))).toBe(true)
    expect(isPasada('2020-01-03', '08:00', new Date(2020, 0, 2, 9, 0))).toBe(false)
  })

  it('interpreta asiento estándar y tolera formatos incompletos', () => {
    expect(parseNumeroAsiento('12a')).toEqual({ fila: '12', columna: 'A' })
    expect(parseNumeroAsiento('12')).toEqual({ fila: '12', columna: '?' })
    expect(parseNumeroAsiento(' asiento raro ')).toEqual({ fila: 'ASIENTO RARO', columna: '?' })
  })

  it('construye la dirección de reservación con los parámetros del equipo', () => {
    expect(buildReservarUrl('V100', 'V100-12A')).toBe('/reservar?vueloId=V100&asientoId=V100-12A')
  })
})
