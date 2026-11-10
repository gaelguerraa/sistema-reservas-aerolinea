import { ESTADO_ETIQUETA } from '../utils'
import type { EstadoReserva } from '../types'

/** Insignia de color por estado. El texto también dice el estado (no depende solo del color). */
export function EstadoBadge({ estado }: { estado: EstadoReserva }) {
  return <span className={`estado-badge estado-${estado.toLowerCase()}`}>{ESTADO_ETIQUETA[estado]}</span>
}
