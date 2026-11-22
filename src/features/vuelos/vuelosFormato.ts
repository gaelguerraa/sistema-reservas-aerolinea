export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha
}

export function fechaISO(fecha: string): string {
  return fecha.slice(0, 10)
}

export function filtrosDesdeEstado(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' ? from : ''
}

export function avisoDesdeEstado(state: unknown): string | null {
  const notice = (state as { notice?: unknown } | null)?.notice
  return typeof notice === 'string' ? notice : null
}