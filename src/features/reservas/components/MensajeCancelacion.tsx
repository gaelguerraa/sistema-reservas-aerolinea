import { formatFechaLarga } from '../../vuelos/utils'
import type { ReservaConVuelo } from '../types'
import { etiquetaAsiento } from '../utils'

/** Texto del diálogo: dice exactamente qué se va a cancelar. */
export function MensajeCancelacion({ item }: { item: ReservaConVuelo }) {
  const { reserva, vuelo } = item
  return (
    <p>
      Vas a cancelar el asiento <strong>{etiquetaAsiento(item)}</strong> del vuelo <strong>{reserva.vueloId}</strong>
      {vuelo && <> ({vuelo.origen} → {vuelo.destino}, {formatFechaLarga(vuelo.fecha)})</>}.
      {' '}El asiento quedará libre para otra persona y esta acción no se puede deshacer.
    </p>
  )
}
